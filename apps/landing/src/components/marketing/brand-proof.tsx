import Image from 'next/image';
import './brand-proof.css';

const brands = [
  ['bofe', 'Bofe'],
  ['ayvazoglu', 'Ayvazoğlu İnşaat'],
  ['cilingir', 'Çilingir'],
  ['antic', 'Antic'],
  ['momora', 'Momora'],
  ['veriburada', 'Veri Burada'],
];

const facts = [
  ['3', 'Liste hazırlama yolu'],
  ['3', 'Kreatif AI tasarım yönü'],
  ['10x', 'Daha hızlı kampanya akışı'],
  ['1', 'Ortak gelen kutusu'],
];

export function BrandProof() {
  return (
    <section className="bp-section" aria-label="Markalar ve Mesajify ürün kapsamı">
      <div className="bp-marquee">
        <div className="bp-track">
          {[0, 1].map((copy) => (
            <div className="bp-set" key={copy} aria-hidden={copy === 1}>
              {brands.map(([id, name]) => (
                <div className={`bp-brand bp-${id}`} key={id}>
                  <Image
                    src={`/landing/brands/${id}.webp`}
                    alt={copy === 0 ? name : ''}
                    width={240}
                    height={100}
                    unoptimized
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="bp-facts">
        {facts.map(([number, label]) => (
          <div key={label}>
            <strong>{number}</strong>
            <span>{label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
