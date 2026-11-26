import { SystemLink } from "./shell";

export function AppSide({ name, about, tryThis }: { name: string; about: string; tryThis: string }) {
  return (
    <div className="space-y-4">
      <SystemLink />
      <h2 className="text-4xl font-extrabold text-primary-deep">{name}</h2>
      <p className="text-muted-foreground">{about}</p>
      <p className="text-sm text-muted-foreground">Try: {tryThis}</p>
    </div>
  );
}
