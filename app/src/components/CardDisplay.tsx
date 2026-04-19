type CardDisplayProps = {
  practice: string
  native: string
  targetName: string
}

export function CardDisplay({ practice, native, targetName }: CardDisplayProps) {
  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-xl">
      <p className="text-sm text-muted-foreground">Voor {targetName}</p>
      <p className="text-3xl font-semibold text-center">{practice}</p>
      <p className="text-sm text-muted-foreground text-center">{native}</p>
    </div>
  )
}
