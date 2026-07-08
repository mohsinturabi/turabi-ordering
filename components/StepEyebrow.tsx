export default function StepEyebrow({ step, of }: { step: number; of: number }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="font-mono text-xs tracking-wide text-accent">
        {String(step).padStart(2, '0')} / {String(of).padStart(2, '0')}
      </span>
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}
