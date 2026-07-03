function PagePlaceholder({ eyebrow, title, description }) {
  return (
    <section className="page">
      <header className="page-header">
        <div>
          <span className="page-eyebrow">{eyebrow}</span>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        <div className="date-chip" aria-label="Bugünün tarihi">
          <span>Bugün</span>
          <strong>
            {new Intl.DateTimeFormat('tr-TR', {
              day: 'numeric',
              month: 'short',
            }).format(new Date())}
          </strong>
        </div>
      </header>

      <div className="placeholder-card">
        <div className="placeholder-icon" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <h2>Sayfa iskeleti hazır</h2>
        <p>
          Bu alanın veri modeli ve işlevleri sonraki geliştirme adımında
          eklenecek.
        </p>
      </div>
    </section>
  )
}

export default PagePlaceholder
