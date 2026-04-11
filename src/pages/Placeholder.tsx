interface Props {
  title: string;
  description: string;
  hint?: string;
}

export default function Placeholder({ title, description, hint }: Props) {
  return (
    <div className="flex-1 flex items-center justify-center px-6 py-16">
      <div className="max-w-md text-center">
        <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-[#DAA520]/10 flex items-center justify-center">
          <img src="/troy-avatar.png" alt="Troy" className="w-9 h-9 rounded-full" />
        </div>
        <h1 className="text-lg font-semibold text-[#DAA520] mb-2">{title}</h1>
        <p className="text-sm text-text-secondary mb-3">{description}</p>
        {hint && <p className="text-xs text-text-muted">{hint}</p>}
      </div>
    </div>
  );
}
