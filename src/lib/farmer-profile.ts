export const farmerProfileFields = [
  "growerNumber",
  "nationalId",
  "firstName",
  "surname",
  "farmName",
  "province",
  "district",
  "ward",
  "phone",
  "alternatePhone",
  "contractingCompany",
] as const;

export type FarmerProfileDraft = Record<(typeof farmerProfileFields)[number], string>;

export function getFarmerProfileCompletion(profile: FarmerProfileDraft): number {
  const completed = farmerProfileFields.filter((field) => profile[field].trim().length > 0).length;
  return Math.round((completed / farmerProfileFields.length) * 100);
}
