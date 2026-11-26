import { useLanguage, type AppLanguage } from "@/lib/language-context";

export function LanguageSelector({ className = "" }: { className?: string }) {
  const { language, setLanguage, t } = useLanguage();

  const changeLanguage = (value: string) => {
    if (value === "en" || value === "sn" || value === "nd") {
      setLanguage(value as AppLanguage);
    }
  };

  return (
    <select
      aria-label={t("Language")}
      value={language}
      onChange={(event) => changeLanguage(event.currentTarget.value)}
      className={`h-9 max-w-32 rounded-lg border border-input bg-card px-2 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-ring ${className}`}
    >
      <option value="en">English</option>
      <option value="sn">Shona</option>
      <option value="nd">Ndebele</option>
    </select>
  );
}
