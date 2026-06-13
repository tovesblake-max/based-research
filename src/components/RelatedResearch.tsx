"use client";

import { BookOpen, ExternalLink } from "lucide-react";
import { getBlogLinksForProduct } from "@/lib/product-blog-links";

/**
 * "Related Research" block — linked out to blog.basedresearch.com articles
 * relevant to the current product. Boosts E-E-A-T for the product page and
 * drives readers to long-form research content.
 */
export default function RelatedResearch({ productSlug }: { productSlug: string }) {
  const articles = getBlogLinksForProduct(productSlug);
  if (articles.length === 0) return null;

  return (
    <section className="mt-10 pt-8 border-t border-border">
      <div className="flex items-center gap-2 mb-4">
        <BookOpen className="w-4 h-4 text-primary" aria-hidden="true" />
        <h2 className="font-serif text-xl text-foreground">Related Research</h2>
      </div>
      <p className="text-sm text-muted mb-5 max-w-2xl">
        Preclinical research summaries from our research blog covering the
        mechanisms and pharmacology relevant to this compound.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {articles.map((article) => (
          <a
            key={article.slug}
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-start gap-3 p-4 rounded-xl border border-border bg-card hover:border-primary/30 hover:shadow-sm transition-all"
          >
            <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 group-hover:bg-primary group-hover:text-white transition-colors">
              <BookOpen className="w-4 h-4" aria-hidden="true" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground leading-snug">
                {article.title}
              </p>
              <p className="text-xs text-muted mt-1 flex items-center gap-1.5">
                <span>{article.readingTime}</span>
                <span aria-hidden="true">·</span>
                <span className="flex items-center gap-0.5">
                  blog.basedresearch.com{" "}
                  <ExternalLink className="w-3 h-3" aria-hidden="true" />
                </span>
              </p>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}
