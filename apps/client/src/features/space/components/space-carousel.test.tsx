import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import { beforeAll, describe, expect, it, vi } from "vitest";
import SpaceCarousel from "./space-carousel";

const useGetSpacesQueryMock = vi.fn();

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock("@/features/space/queries/space-query.ts", () => ({
  prefetchSpace: vi.fn(),
  useGetSpacesQuery: (...args: unknown[]) => useGetSpacesQueryMock(...args),
}));

vi.mock("@/components/ui/custom-avatar.tsx", () => ({
  CustomAvatar: ({ name }: { name: string }) => (
    <div aria-label={`${name} avatar`} />
  ),
}));

vi.mock("@/components/ui/card-carousel", () => ({
  default: ({
    children,
    ariaLabel,
  }: {
    children: ReactNode;
    ariaLabel?: string;
  }) => <div aria-label={ariaLabel}>{children}</div>,
}));

function renderSpaceCarousel() {
  return render(
    <MantineProvider>
      <MemoryRouter>
        <SpaceCarousel />
      </MemoryRouter>
    </MantineProvider>,
  );
}

describe("SpaceCarousel", () => {
  beforeAll(() => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  it("does not show member counts for spaces you belong to", () => {
    useGetSpacesQueryMock.mockReturnValue({
      isPending: false,
      data: {
        items: [
          {
            id: "space-1",
            name: "Engineering",
            slug: "engineering",
            memberCount: 1,
          },
          {
            id: "space-2",
            name: "Design",
            slug: "design",
            memberCount: 12,
          },
        ],
      },
    });

    renderSpaceCarousel();

    expect(screen.getByText("Spaces you belong to")).toBeTruthy();
    expect(screen.getByText("Engineering")).toBeTruthy();
    expect(screen.getByText("Design")).toBeTruthy();
    expect(screen.queryByText("1 member")).toBeNull();
    expect(screen.queryByText("12 members")).toBeNull();
  });
});
