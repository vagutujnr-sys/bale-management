import { Input } from "@/components/ui/input";
import { useLanguage } from "@/lib/language-context";
import { phoneCountryCodes } from "@/lib/phone-number";

export function PhoneNumberField({
  label,
  countryCode,
  number,
  onCountryCodeChange,
  onNumberChange,
  required = true,
  readOnly = false,
}: {
  label: string;
  countryCode: string;
  number: string;
  onCountryCodeChange: (value: string) => void;
  onNumberChange: (value: string) => void;
  required?: boolean;
  readOnly?: boolean;
}) {
  const { t } = useLanguage();

  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium">{t(label)}</span>
      <div className="flex overflow-hidden rounded-xl border border-input bg-background focus-within:ring-2 focus-within:ring-ring">
        <select
          aria-label={t("Country calling code")}
          autoComplete="tel-country-code"
          value={countryCode}
          onChange={(event) => onCountryCodeChange(event.currentTarget.value)}
          className="w-[116px] shrink-0 border-r border-input bg-transparent px-2 text-sm outline-none"
        >
          {phoneCountryCodes.map((country) => (
            <option key={country.code} value={country.code}>
              {country.country} ({country.code})
            </option>
          ))}
        </select>
        <Input
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          placeholder="77 123 4567"
          value={number}
          onChange={(event) => onNumberChange(event.target.value)}
          required={required}
          readOnly={readOnly}
          className="min-w-0 rounded-none border-0 shadow-none focus-visible:ring-0"
        />
      </div>
      <span className="block text-xs text-muted-foreground">
        {t("Enter your number without the leading 0.")}
      </span>
    </label>
  );
}
