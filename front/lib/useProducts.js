'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { apiRequest, API_BASE } from '@/lib/api';

const PAGE_LIMIT = 12;

function buildQuery(params) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') qs.set(k, String(v));
  });
  const s = qs.toString();
  return s ? `?${s}` : '';
}

/**
 * Réplica do filtro de imagem do app.js original: bloqueia imagens de
 * fontes não confiáveis (ex: picsum.photos usado nos produtos fictícios
 * desativados), aceitando só caminhos relativos (/uploads, /seed-images)
 * ou a própria origem da API.
 */
function hasValidImage(p) {
  return !!(p.image && (p.image.startsWith('/') || p.image.startsWith(API_BASE.replace(/\/api$/, ''))));
}

/**
 * useProducts — réplica de loadProducts/loadMore/buildQuery do front
 * vanilla. Mantém os mesmos parâmetros de query (category, sort, q, page,
 * limit) e a mesma filtragem de imagens válidas.
 */
export function useProducts({ category = 'all', sort = 'newest', search = '' } = {}) {
  const [products, setProducts] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [status, setStatus] = useState('loading'); // 'loading' | 'ready' | 'empty' | 'error'
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Evita condição de corrida: só aplica a resposta da requisição mais recente.
  const requestIdRef = useRef(0);

  const fetchPage = useCallback(async (targetPage, append) => {
    const requestId = ++requestIdRef.current;
    if (!append) setStatus('loading');
    else setIsLoadingMore(true);

    try {
      const params = { page: targetPage, limit: PAGE_LIMIT };
      if (category !== 'all') params.category = category;
      if (sort) params.sort = sort;
      if (search) params.q = search;

      const data = await apiRequest(`/products${buildQuery(params)}`);
      if (requestId !== requestIdRef.current) return; // resposta obsoleta

      const rawProducts = (data && data.products) || [];
      const validProducts = rawProducts.filter(hasValidImage);
      const more = !!(data && data.hasMore);

      setHasMore(more);
      setProducts((prev) => (append ? [...prev, ...validProducts] : validProducts));

      if (!append) {
        setStatus(validProducts.length ? 'ready' : 'empty');
      }
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      if (!append) {
        setStatus('error');
        setErrorMessage(
          err.status === undefined
            ? 'Não foi possível conectar à loja. Verifique sua internet.'
            : 'Não foi possível carregar os produtos. Tente novamente.'
        );
      }
      // Em "carregar mais", o erro é só um toast no componente que consome o hook.
    } finally {
      if (requestId === requestIdRef.current) setIsLoadingMore(false);
    }
  }, [category, sort, search]);

  // Sempre que filtro/sort/busca mudam, reseta para a página 1.
  useEffect(() => {
    setPage(1);
    fetchPage(1, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, sort, search]);

  const loadMore = useCallback(() => {
    if (isLoadingMore || !hasMore) return;
    const next = page + 1;
    setPage(next);
    fetchPage(next, true);
  }, [isLoadingMore, hasMore, page, fetchPage]);

  const retry = useCallback(() => fetchPage(1, false), [fetchPage]);

  return { products, status, errorMessage, hasMore, isLoadingMore, loadMore, retry };
}
