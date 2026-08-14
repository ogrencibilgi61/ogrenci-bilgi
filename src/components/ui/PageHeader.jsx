function PageHeader({ eyebrow, title, description, action }) {
  return (
    <header className="page-header">
      <div>
        <span className="page-eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {action ?? (
        <div className="date-chip" aria-label="Bugünün tarihi">
          <span>Bugün</span>
          <strong>
            {new Intl.DateTimeFormat('tr-TR', {
              day: 'numeric',
              month: 'short',
            }).format(new Date())}
          </strong>
        </div>
      )}
    </header>
  )
}

export default PageHeader
