type CardDisplayProps = {
  practice: string
  native: string
  targetName: string
  romanization?: string | null
}

export function CardDisplay({
  practice,
  native,
  targetName,
  romanization,
}: CardDisplayProps) {
  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-xl">
      <p className="text-sm text-muted-foreground">Voor {targetName}</p>
      <p className="text-3xl font-semibold text-center">{practice}</p>
      {romanization ? (
        <p
          data-testid="card-romanization"
          className="text-base italic text-muted-foreground text-center"
        >
          {romanization}
        </p>
      ) : null}
      <p className="text-sm text-muted-foreground text-center">{native}</p>
    </div>
  )
}
