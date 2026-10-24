/**
 * The card the auth forms sit in, so login, owner setup and invited
 * signup all look the same. No server or client directive: it is used
 * from both the server pages and the client forms.
 */
export function AuthCard({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="grid size-11 place-items-center rounded-xl bg-violet-500/15 text-violet-500 ring-1 ring-violet-400/30 dark:text-violet-300">
          {icon}
        </div>
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
