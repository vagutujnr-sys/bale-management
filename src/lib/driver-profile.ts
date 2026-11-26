export type DriverRegistrationDraft = {
  transporterName: string;
  transporterRegistrationNumber: string;
  transporterContactPerson: string;
  transporterPhone: string;
  transporterAddress: string;
  transporterPermitNumber: string;
  transporterPermitExpiresOn: string;
  fullName: string;
  nationalId: string;
  phone: string;
  licenceNumber: string;
  licenceClass: string;
  licenceExpiresOn: string;
  vehicleRegistrationNumber: string;
  vehicleType: string;
  makeModel: string;
  capacityKg: string;
  trailerNumber: string;
  insuranceNumber: string;
  insuranceExpiresOn: string;
  vehiclePermitNumber: string;
  vehiclePermitExpiresOn: string;
  pin: string;
};

export const driverRegistrationFields: (keyof Omit<DriverRegistrationDraft, "pin">)[] = [
  "transporterName",
  "transporterRegistrationNumber",
  "transporterContactPerson",
  "transporterPhone",
  "transporterAddress",
  "transporterPermitNumber",
  "transporterPermitExpiresOn",
  "fullName",
  "nationalId",
  "phone",
  "licenceNumber",
  "licenceClass",
  "licenceExpiresOn",
  "vehicleRegistrationNumber",
  "vehicleType",
  "makeModel",
  "capacityKg",
  "insuranceNumber",
  "insuranceExpiresOn",
  "vehiclePermitNumber",
  "vehiclePermitExpiresOn",
];
