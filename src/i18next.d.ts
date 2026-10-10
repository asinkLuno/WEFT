import en from "./i18n/locales/en.json";

// Makes t() keys type-checked against the English resources.
declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "translation";
    resources: {
      translation: typeof en;
    };
  }
}
