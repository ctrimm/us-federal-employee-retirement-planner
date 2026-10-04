/**
 * Standard disclaimer shown across FEREX surfaces.
 * FEREX is a planning tool, not professional advice.
 */
export function Disclaimer({ className = '' }: { className?: string }) {
  return (
    <p className={`text-xs text-muted-foreground text-center max-w-2xl mx-auto ${className}`}>
      FEREX is a planning tool for educational purposes only — not professional financial,
      tax, or legal advice. Estimates use simplified models and assumptions; verify your
      benefits with OPM and your agency benefits officer before making retirement decisions.
    </p>
  );
}
