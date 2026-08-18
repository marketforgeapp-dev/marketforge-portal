export type StrategySessionFormState = {
  status: "idle" | "success" | "error";
  message: string;
  fieldErrors?: Partial<
    Record<
      | "name"
      | "email"
      | "phone"
      | "businessName"
      | "website"
      | "availability",
      string[]
    >
  >;
};