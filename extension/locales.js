(() => {
  // X's 45 display-language choices. Source URLs: docs/locale-sources.json.
  const translations = {
    ar: "عرض الترجمة",
    "ar-x-fm": "عرض الترجمة",
    bn: "অনুবাদ দেখান",
    "en-GB": "Show translation",
    bg: "Показване на превод",
    ca: "Mostra la traducció",
    hr: "Prikaži prijevod",
    cs: "Zobrazit překlad",
    da: "Vis oversættelse",
    nl: "Vertaling tonen",
    en: "Show translation",
    fil: "Ipakita ang pagsasalin",
    fi: "Näytä käännös",
    fr: "Afficher la traduction",
    de: "Übersetzung zeigen",
    el: "Εμφάνιση μετάφρασης",
    gu: "અનુવાદ બતાવો",
    he: "הצגת תרגום",
    hi: "अनुवाद दिखाएं",
    hu: "Fordítás megjelenítése",
    id: "Tampilkan terjemahan",
    it: "Mostra traduzione",
    ja: "翻訳を表示",
    kn: "ಅನುವಾದವನ್ನು ತೋರಿಸಿ",
    ko: "번역 보기",
    ms: "Tunjukkan terjemahan",
    mr: "भाषांतर दाखवा",
    nb: "Vis oversettelse",
    fa: "نشان دادن ترجمه",
    pl: "Pokaż tłumaczenie",
    pt: "Mostrar tradução",
    ro: "Afișează traducerea",
    ru: "Показать перевод",
    sr: "Прикажи превод",
    zh: "显示翻译",
    sk: "Zobraziť preklad",
    es: "Mostrar traducción",
    sv: "Visa översättningen",
    ta: "மொழிபெயர்ப்பைக் காட்டு",
    th: "แสดงการแปล",
    "zh-Hant": "顯示翻譯",
    tr: "Çeviriyi göster",
    uk: "Показати переклад",
    ur: "Show translation",
    vi: "Hiện bản dịch",
  };
  const locales = new Map(
    Object.entries(translations).map(([language, translationLabel]) => [
      language.toLowerCase(),
      { language, translationLabel },
    ]),
  );
  const translationLabels = new Set(Object.values(translations));
  const aliases = new Map([
    ["msa", "ms"],
    ["no", "nb"],
    ["zh-cn", "zh"],
    ["zh-sg", "zh"],
    ["zh-hans", "zh"],
    ["zh-tw", "zh-hant"],
    ["zh-hk", "zh-hant"],
    ["zh-mo", "zh-hant"],
  ]);

  function resolve(language) {
    if (typeof language !== "string") return null;
    let code = language.trim().toLowerCase().replaceAll("_", "-");
    while (code) {
      const locale = locales.get(aliases.get(code) ?? code);
      if (locale) return locale;
      const separator = code.lastIndexOf("-");
      code = separator < 0 ? "" : code.slice(0, separator);
    }
    return null;
  }

  globalThis.TwitterBirdLocales = {
    resolve,
    isTranslationLabel: (label) => translationLabels.has(label),
  };
})();
