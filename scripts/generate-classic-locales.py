"""Build a bounded catalogue from official X/Twitter resources, without executing JS.

Run: python3 scripts/generate-classic-locales.py --output extension/classic-locales.js
Downloaded source is cached by immutable asset filename under ignored .pi/research/assets/.
"""
import argparse
import ast
import concurrent.futures
import json
import re
import urllib.request
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
HISTORICAL = {
    'en': '64296fba', 'en-GB': '370d492a', 'zh': '7483b50a', 'zh-Hant': 'fcfacbea',
    'ja': '19bd9f1a', 'ko': '8ece0f6a', 'es': 'b07ff23a', 'ru': '5b27460a', 'uk': '5327ea7a',
}
NOUNS = {
    'en': ('Post', 'Tweet'), 'en-GB': ('Post', 'Tweet'), 'zh': ('帖子', '推文'),
    'zh-Hant': ('貼文', '推文'), 'ja': ('ポスト', 'ツイート'), 'ko': ('게시물', '트윗'),
    'es': ('Post', 'Tweet'), 'ru': ('Пост', 'Твит'), 'uk': ('Пост', 'Твіт'),
}
TERMS = dict(zip(
    ['post', 'posts', 'posted', 'posting', 'repost', 'reposts', 'reposted', 'reposting'],
    ['tweet', 'tweets', 'tweeted', 'tweeting', 'retweet', 'retweets', 'retweeted', 'retweeting'],
    strict=True,
))
WORD = re.compile(r'\b(?:reposting|reposted|reposts|repost|posting|posted|posts|post)\b', re.I)
STRING = r'''(?:"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')'''
CATEGORIES = ['one', 'few', 'many', 'other']


def canonical(text):
    return WORD.sub(lambda m: TERMS[m[0].lower()], text.lower()).replace('’', "'")


def parse_json(text):
    try:
        return json.loads(text)
    except json.JSONDecodeError as error:
        raise ValueError('Invalid localization JSON: ' + str(error)) from error


def fetch(url):
    if not re.fullmatch(r'https://abs\.twimg\.com/responsive-web/client-web/i18n/[a-zA-Z-]+\.[a-f0-9]+\.js', url):
        raise ValueError('Unexpected asset URL: ' + url)
    cache = ROOT / '.pi/research/assets' / url.rsplit('/', 1)[1]
    if not cache.exists():
        cache.parent.mkdir(parents=True, exist_ok=True)
        # Only the allowlisted HTTPS origin and asset path above are permitted.
        with urllib.request.urlopen(url, timeout=45) as response:  # nosec B310
            if response.geturl() != url:
                raise ValueError('Unexpected asset redirect')
            content = response.read(8_000_001)
            if len(content) > 8_000_000:
                raise ValueError('Unexpected asset size')
        cache.write_bytes(content)
    source = cache.read_text()
    messages = {m[1]: parse_json(m[2]) for m in re.finditer(r'\b\w+\("([a-z0-9]{8})",("(?:\\.|[^"\\])*")\)', source)}
    if len(messages) <= 1000:
        raise ValueError('Unexpected static message format')
    return source, messages


def template(source, identifier, category='other'):
    """Parse only string concatenation, known fields, and literal plural alternatives."""
    match = re.search(r'\("' + re.escape(identifier) + r'",\(?function\((\w+)\)\{return([^}]+)\}', source)
    if not match:
        raise ValueError('Missing template: ' + identifier)
    parameter, rest = match.groups()
    rest = rest.strip()
    result = ''
    while rest:
        string = re.match(STRING, rest)
        field = re.match(re.escape(parameter) + r'\.(fullName|tweetText|count)\b', rest)
        plural = re.match(r'\w+\(' + re.escape(parameter) + r'\.count,(' + STRING + r'(?:,' + STRING + r')*)\)', rest)
        if string:
            result += ast.literal_eval(string[0])
            rest = rest[string.end():]
        elif field:
            result += {'fullName': '{name}', 'tweetText': '{text}', 'count': '{count}'}[field[1]]
            rest = rest[field.end():]
        elif plural:
            choices = [ast.literal_eval(x[0]) for x in re.finditer(STRING, plural[1])]
            if len(choices) not in [2, 4]:
                raise ValueError('Unsupported plural alternatives: ' + identifier)
            index = (0 if category == 'one' else 1) if len(choices) == 2 else {'few': 0, 'many': 1, 'one': 2, 'other': 3}[category]
            result += choices[index]
            rest = rest[plural.end():]
        else:
            raise ValueError('Unsupported template syntax: ' + identifier)
        rest = rest.lstrip()
        if rest:
            if not rest.startswith('+'):
                raise ValueError('Unsupported template operator: ' + identifier)
            rest = rest[1:].lstrip()
    return result


def unique_pairs(pairs):
    # A source label with conflicting historical translations is not safe to guess.
    candidates = defaultdict(set)
    for current, historical in pairs:
        candidates[current.strip()].add(historical.strip())
    return {current: next(iter(values)) for current, values in candidates.items()
            if len(values) == 1 and current not in values}


def build(resources):
    old_en = resources['en']['historical'][1]
    new_en = resources['en']['current'][1]
    index = defaultdict(list)
    for key, value in old_en.items():
        index[canonical(value)].append(key)
    equivalents = {key: index[canonical(value)] for key, value in new_en.items()
                   if WORD.search(value) and index[canonical(value)] and key != 'bf81d3e2'}
    # The two old English errors said "Try Retweet" rather than "Try Retweeting".
    for current, historical in [('h32b1ac4', 'f1d600ac'), ('d8e56f40', 'j3403c06')]:
        if current not in new_en or historical not in old_en:
            raise ValueError('Missing error-message source pair')
        equivalents[current] = [historical]
    english_source = (ROOT / 'extension/classic-ui.js').read_text()
    notice_section = english_source.split('const notificationMessages = new Set(', 1)[1].split('].map(notificationKey)', 1)[0]
    notice_text = {parse_json(m[0]) for m in re.finditer(r'"(?:\\.|[^"\\])*"', notice_section)}
    if len(notice_text) != 50:
        raise ValueError('Review the changed English notification allowlist')
    result = {}
    for language, versions in resources.items():
        old_source, old = versions['historical']
        new_source, new = versions['current']
        labels, notices = [], []
        for current, historical_keys in equivalents.items():
            for historical in historical_keys:
                if current not in new or historical not in old:
                    continue
                pair = (new[current], old[historical])
                labels.append(pair)
                if new_en[current] in notice_text:
                    notices.append(pair)
        noun, old_noun = NOUNS[language]
        if not any(old_noun.lower() in value.lower() for value in old.values()):
            raise ValueError('Unverified historical noun: ' + language)
        # These features postdate the snapshot. Preserve the modern meaning and
        # grammar, changing only the verified historical noun (not the whole feature).
        for key in ['a50c911e', 'ie08d3a4']:
            current = new[key]
            restored = current.replace(noun, old_noun).replace(noun.lower(), old_noun.lower())
            if language.startswith('en'):
                restored = WORD.sub(lambda m: TERMS[m[0].lower()], current)
            labels.append((current, restored))
            notices.append((current, restored))
        actions = unique_pairs([(new['df34a454'], old['bea869b4']),
                                (new['f2919fb8'], old['d6c8514a']),
                                (new['fd1e5446'], old['f3bbbb88']),
                                (new['b8c465e2'], old['g23ce6f0'])])
        headings = unique_pairs([(noun, old_noun), (new['fa4e68ca'], old['bab1f8b0']),
                                 (new['ja42739e'], old['d497b854'])])
        counts = []
        for current, historical, action in [('dfad425d', 'i769b0ab', 'd6c8514a'), ('a386dc55', 'ea9a1f0d', 'g23ce6f0')]:
            for category in CATEGORIES:
                before = template(new_source, current, category)
                # The old Ukrainian pressed template has the complete noun cases;
                # use those for both states rather than its inconsistent old plural.
                after = template(old_source, 'ea9a1f0d' if language == 'uk' else historical, category)
                if language in ['ru', 'uk']:
                    after = after.split('.', 1)[0] + '. ' + old[action]
                if before.count('{count}') != 1 or after.count('{count}') != 1:
                    raise ValueError('Unexpected count placeholders: ' + language)
                if [before, after] not in counts:
                    counts.append([before, after])
        title_before = template(new_source, 'a4d3eb67')
        title_after = template(old_source, 'f0c37ddb')
        for title in [title_before, title_after]:
            if title.count('{name}') != 1 or title.count('{text}') != 1:
                raise ValueError('Unexpected title placeholders: ' + language)
        result[language] = {
            'brand': old['d2fb334c'], 'actions': actions, 'headings': headings,
            'composer': {new['ed1f39ec']: old['ad993b0e']},
            'labels': unique_pairs(labels), 'notices': unique_pairs(notices),
            'counts': counts, 'title': [title_before, title_after],
        }
        print(language, len(result[language]['labels']), 'labels,', len(result[language]['notices']), 'distinct notices', flush=True)
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    current = parse_json((ROOT / 'docs/locale-sources.json').read_text())
    sources = {language: {'current': current[language], 'historical': f'https://abs.twimg.com/responsive-web/client-web/i18n/{language}.{version}.js'} for language, version in HISTORICAL.items()}
    jobs = [(language, version, url) for language, versions in sources.items() for version, url in versions.items()]
    resources = {language: {} for language in HISTORICAL}
    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool:
        for (language, version, _), data in zip(jobs, pool.map(fetch, [job[2] for job in jobs]), strict=True):
            resources[language][version] = data
    catalogue = build(resources)
    catalogue['$sources'] = sources
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text('// Generated by scripts/generate-classic-locales.py; see docs/localization.md.\n'
                           + 'globalThis.TwitterBirdClassicLocales = ' + json.dumps(catalogue, ensure_ascii=False, indent=2) + ';\n')


if __name__ == '__main__':
    # A small runnable check for the deliberately restricted parser and ambiguity guard.
    assert template('o("12345678",function(e){return e.count+" post"+r(e.count,"","s")})', '12345678', 'one') == '{count} post'
    assert template('o("12345678",function(e){return e.fullName+" / "+e.tweetText})', '12345678') == '{name} / {text}'
    try:
        template('o("12345678",function(e){return doSomething(e)})', '12345678')
    except ValueError:
        pass
    else:
        raise AssertionError('Unsupported downloaded syntax must never run')
    ambiguous = [('a', 'b'), ('a', 'c'), ('d', 'e')]
    assert unique_pairs(ambiguous) == {'d': 'e'}
    try:
        main()
    except (OSError, ValueError) as error:
        raise SystemExit(str(error)) from error
