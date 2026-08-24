/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. Unauthorized copying or redistribution is strictly prohibited. */
/**
 * Compatibility layer that maps the legacy React Router API surface used across
 * the imported ZKG codebase onto TanStack Router (the router this stack uses).
 *
 * Only this file knows about the translation — component code keeps its
 * familiar `Link` / `useNavigate` / `useParams` imports.
 */
import * as React from "react";
import {
  Link as TanStackLink,
  Outlet,
  useNavigate as useTanStackNavigate,
  useParams as useTanStackParams,
  useRouter,
  useRouterState,
} from "@tanstack/react-router";

export { Outlet };

type AnyProps = Record<string, unknown>;

function toHref(to: unknown): string {
  if (typeof to === "string") return to;
  if (to && typeof to === "object") {
    const t = to as { pathname?: string; search?: string; hash?: string };
    return `${t.pathname ?? ""}${t.search ?? ""}${t.hash ?? ""}`;
  }
  return "/";
}

export type LinkProps = {
  to: string | { pathname?: string; search?: string; hash?: string };
  replace?: boolean;
  state?: unknown;
  children?: React.ReactNode;
} & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href">;

export const Link = React.forwardRef<HTMLAnchorElement, LinkProps>(function Link(
  { to, replace, state, ...rest },
  ref,
) {
  const Anchor = TanStackLink as unknown as React.ComponentType<AnyProps>;
  return <Anchor ref={ref} href={toHref(to)} replace={replace} {...(rest as AnyProps)} />;
});

export type NavLinkRenderProps = { isActive: boolean; isPending: boolean };

export type NavLinkProps = Omit<LinkProps, "className" | "children" | "style"> & {
  className?: string | ((props: NavLinkRenderProps) => string);
  style?: React.CSSProperties | ((props: NavLinkRenderProps) => React.CSSProperties);
  children?: React.ReactNode | ((props: NavLinkRenderProps) => React.ReactNode);
  end?: boolean;
};

export const NavLink = React.forwardRef<HTMLAnchorElement, NavLinkProps>(function NavLink(
  { to, className, style, children, end, ...rest },
  ref,
) {
  const pathname = usePathname();
  const target = toHref(to).split("?")[0]?.split("#")[0] ?? "/";
  const isActive = end
    ? pathname === target
    : pathname === target || (target !== "/" && pathname.startsWith(`${target}/`));
  const renderProps: NavLinkRenderProps = { isActive, isPending: false };

  return (
    <Link
      ref={ref}
      to={to}
      className={typeof className === "function" ? className(renderProps) : className}
      style={typeof style === "function" ? style(renderProps) : style}
      aria-current={isActive ? "page" : undefined}
      {...rest}
    >
      {typeof children === "function" ? children(renderProps) : children}
    </Link>
  );
});

function usePathname(): string {
  return useRouterState({ select: (s) => s.location.pathname });
}

export function useLocation() {
  const location = useRouterState({ select: (s) => s.location });
  return {
    pathname: location.pathname,
    search: location.searchStr ?? "",
    hash: location.hash ? `#${location.hash}` : "",
    state: location.state as unknown,
    key: (location as any).key ?? "default",
  };
}

export function useNavigate() {
  const navigate = useTanStackNavigate();
  const router = useRouter();

  return React.useCallback(
    (to: unknown, options?: { replace?: boolean; state?: unknown }) => {
      if (typeof to === "number") {
        router.history.go(to);
        return;
      }
      void navigate({ href: toHref(to), replace: options?.replace } as never);
    },
    [navigate, router],
  );
}

export function useParams<T extends Record<string, string | undefined> = Record<string, string | undefined>>(): T {
  return useTanStackParams({ strict: false }) as unknown as T;
}

export function useSearchParams(): [
  URLSearchParams,
  (next: URLSearchParams | Record<string, string> | ((prev: URLSearchParams) => URLSearchParams), options?: { replace?: boolean }) => void,
] {
  const searchStr = useRouterState({ select: (s) => s.location.searchStr ?? "" });
  const pathname = usePathname();
  const navigate = useNavigate();
  const params = React.useMemo(() => new URLSearchParams(searchStr), [searchStr]);

  const setSearchParams = React.useCallback(
    (
      next: URLSearchParams | Record<string, string> | ((prev: URLSearchParams) => URLSearchParams),
      options?: { replace?: boolean },
    ) => {
      const resolved =
        typeof next === "function"
          ? next(new URLSearchParams(searchStr))
          : next instanceof URLSearchParams
            ? next
            : new URLSearchParams(next);
      const qs = resolved.toString();
      navigate(qs ? `${pathname}?${qs}` : pathname, options);
    },
    [navigate, pathname, searchStr],
  );

  return [params, setSearchParams];
}

export function Navigate({
  to,
  replace,
}: {
  to: string | { pathname?: string; search?: string; hash?: string };
  replace?: boolean;
}) {
  const navigate = useNavigate();
  React.useEffect(() => {
    navigate(to, { replace: replace ?? true });
  }, [navigate, to, replace]);
  return null;
}
