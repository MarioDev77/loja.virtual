/**
 * ProductSkeletons — réplica de renderSkeletons() em app.js original.
 */
export default function ProductSkeletons({ count = 8 }) {
  return (
    <div className="products-grid" aria-label="Carregando produtos">
      {Array.from({ length: count }).map((_, i) => (
        <div className="product-card skeleton" key={i}>
          <div className="product-img-wrap skeleton-img" />
          <div className="body">
            <span className="skeleton-line short" />
            <span className="skeleton-line" />
            <span className="skeleton-line price" />
          </div>
        </div>
      ))}
    </div>
  );
}
