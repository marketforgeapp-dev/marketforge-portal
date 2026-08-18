import { JsonLd } from "./json-ld";

import {
  buildOrganizationSchema,
  buildWebsiteSchema,
} from "@/lib/public-site/structured-data";

export function PublicEntitySchema() {
  return (
    <JsonLd
      data={[
        buildOrganizationSchema(),
        buildWebsiteSchema(),
      ]}
    />
  );
}