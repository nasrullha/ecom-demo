// Places and delivery modes for the Maldives.
// "courier" = our own courier to the door (Greater Malé area).
// "vessel"  = sent by a scheduled vessel/boat to the island's jetty.
// Island names are typed by the customer; this list only has the atolls.

export type DeliveryMethod = "courier" | "vessel";

export interface Atoll {
  value: string; // what is stored on the order
  label: string; // what the customer sees
  group: "Greater Malé" | "Atolls";
}

export const ATOLLS: Atoll[] = [
  { value: "Malé City", label: "Malé City", group: "Greater Malé" },
  { value: "Hulhumalé", label: "Hulhumalé", group: "Greater Malé" },
  { value: "Villimalé", label: "Villimalé", group: "Greater Malé" },
  { value: "HA", label: "Haa Alif (HA)", group: "Atolls" },
  { value: "HDh", label: "Haa Dhaalu (HDh)", group: "Atolls" },
  { value: "Sh", label: "Shaviyani (Sh)", group: "Atolls" },
  { value: "N", label: "Noonu (N)", group: "Atolls" },
  { value: "R", label: "Raa (R)", group: "Atolls" },
  { value: "B", label: "Baa (B)", group: "Atolls" },
  { value: "Lh", label: "Lhaviyani (Lh)", group: "Atolls" },
  { value: "K", label: "Kaafu (K)", group: "Atolls" },
  { value: "AA", label: "Alif Alif (AA)", group: "Atolls" },
  { value: "ADh", label: "Alif Dhaalu (ADh)", group: "Atolls" },
  { value: "V", label: "Vaavu (V)", group: "Atolls" },
  { value: "M", label: "Meemu (M)", group: "Atolls" },
  { value: "F", label: "Faafu (F)", group: "Atolls" },
  { value: "Dh", label: "Dhaalu (Dh)", group: "Atolls" },
  { value: "Th", label: "Thaa (Th)", group: "Atolls" },
  { value: "L", label: "Laamu (L)", group: "Atolls" },
  { value: "GA", label: "Gaafu Alif (GA)", group: "Atolls" },
  { value: "GDh", label: "Gaafu Dhaalu (GDh)", group: "Atolls" },
  { value: "Gn", label: "Gnaviyani (Gn)", group: "Atolls" },
  { value: "S", label: "Addu City (S)", group: "Atolls" },
];

export const ATOLL_VALUES = ATOLLS.map((a) => a.value);

export function deliveryMethodFor(atoll: string): DeliveryMethod {
  const hit = ATOLLS.find((a) => a.value === atoll);
  return hit && hit.group === "Greater Malé" ? "courier" : "vessel";
}

export const DELIVERY_LABEL: Record<DeliveryMethod, string> = {
  courier: "Courier to your door",
  vessel: "Delivery by vessel to your island",
};
