import { useState } from "react";
import { Link } from "react-router";
import { ivaLabel, money, type Product } from "@kiron/shared";
import { useT } from "../i18n";
import { Icon } from "./Icon";

/* Imagen de producto con respaldo (el demo cambiaba la imagen rota por .img-fallback). `large` quita el sufijo
   -300x300 de WordPress para usar la imagen completa (hero y ficha). */
export function ProductImage({ product, large = false }: { product: Pick<Product, "img" | "name">; large?: boolean }) {
  const [failed, setFailed] = useState(false);
  if (failed || !product.img)
    return (
      <div className="img-fallback">
        <Icon name="pill" />
        <span>{product.name}</span>
      </div>
    );
  return (
    <img
      src={large ? product.img.replace("-300x300", "") : product.img}
      alt={product.name}
      loading="lazy"
      width={300}
      height={300}
      onError={() => setFailed(true)}
    />
  );
}

/* Tarjeta de producto (.pcard) del catálogo y destacados. El nombre del producto no se traduce. */
export function ProductCard({ product: p }: { product: Product }) {
  const t = useT();
  return (
    <Link className="pcard rv" to={`/producto/${p.slug}`}>
      <div className="badges">{p.isNew ? <span className="badge badge-new">{t("Nuevo")}</span> : null}</div>
      <div className="pimg">
        <ProductImage product={p} />
      </div>
      <div className="pbody">
        <span className="pcat">{t(p.cat)}</span>
        <span className="pname">{p.name}</span>
        <div className="pfoot">
          <span className="link-arrow">
            {t("Ver producto")} <Icon name="arrow-right" />
          </span>
        </div>
      </div>
    </Link>
  );
}

/* Precio en MXN con la leyenda de IVA (corrección 1: nunca un monto sin decir cómo va el IVA).
   `was` = precio anterior tachado. */
export function Price({ amount, was }: { amount: number; was?: number }) {
  const t = useT();
  return (
    <>
      <b>{money(amount)}</b>
      {was ? <s>{money(was)}</s> : null}
      <small className="iva-note">{t(ivaLabel())}</small>
    </>
  );
}
