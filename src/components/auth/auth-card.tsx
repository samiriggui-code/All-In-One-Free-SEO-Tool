/**
 * The card the auth forms sit in, so login, owner setup and invited
 * signup all look the same. No server or client directive: it is used
 * from both the server pages and the client forms.
 *
 * It opens with the rank_forge mark; a page that needs to say something
 * else first (an expired invite) passes its own icon instead.
 */
import { ProductMark } from "@/components/brand/product-logo";

export function AuthCard({
  icon,
  title,
  subtitle,
  children,
}: {
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        {icon ? (
          <div className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/25">
            {icon}
          </div>
        ) : (
          <ProductMark className="size-12" />
        )}
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {subtitle && (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}
