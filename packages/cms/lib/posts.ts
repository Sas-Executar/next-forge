import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";
import { compileMDX } from "next-mdx-remote/rsc";
import type { ReactElement } from "react";
import readingTime from "reading-time";

export type ContentType = "blog" | "legal";

export interface PostMeta {
  date: string;
  description: string;
  image?: string;
  slug: string;
  title: string;
}

export type Post = PostMeta & {
  content: ReactElement;
  readingTimeMinutes: number;
};

interface Frontmatter {
  date?: string;
  description?: string;
  image?: string;
  title: string;
}

const MDX_EXTENSION = /\.mdx$/;

// `import.meta.dirname` isn't populated for this module inside Next's
// Turbopack server bundle (sitemap generation calls into this at build
// time), but `import.meta.url` reliably is — derive the directory from
// that instead.
const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const getContentRoot = (): string => path.join(moduleDir, "..", "content");

const readSlugs = (type: ContentType): string[] => {
  const dir = path.join(getContentRoot(), type);

  if (!fs.existsSync(dir)) {
    return [];
  }

  return fs
    .readdirSync(dir)
    .filter((file) => file.endsWith(".mdx"))
    .map((file) => file.replace(MDX_EXTENSION, ""));
};

const readRaw = (type: ContentType, slug: string): string | null => {
  // Guard against path traversal — slug always comes from a route param.
  if (slug.includes("/") || slug.includes("..")) {
    return null;
  }

  const filePath = path.join(getContentRoot(), type, `${slug}.mdx`);

  if (!fs.existsSync(filePath)) {
    return null;
  }

  return fs.readFileSync(filePath, "utf-8");
};

const toMeta = (slug: string, raw: string): PostMeta => {
  const { data } = matter(raw);
  const frontmatter = data as Frontmatter;

  return {
    slug,
    title: frontmatter.title,
    description: frontmatter.description ?? "",
    date: frontmatter.date ?? new Date(0).toISOString(),
    image: frontmatter.image,
  };
};

export const getPostsMeta = (type: ContentType): PostMeta[] => {
  const posts = readSlugs(type)
    .map((slug) => {
      const raw = readRaw(type, slug);
      return raw ? toMeta(slug, raw) : null;
    })
    .filter((post): post is PostMeta => post !== null);

  return posts.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
};

export const getPost = async (
  type: ContentType,
  slug: string
): Promise<Post | null> => {
  const raw = readRaw(type, slug);

  if (!raw) {
    return null;
  }

  const { content, frontmatter } = await compileMDX<Frontmatter>({
    source: raw,
    options: { parseFrontmatter: true },
  });

  const stats = readingTime(raw);

  return {
    slug,
    title: frontmatter.title,
    description: frontmatter.description ?? "",
    date: frontmatter.date ?? new Date(0).toISOString(),
    image: frontmatter.image,
    content,
    readingTimeMinutes: Math.max(1, Math.round(stats.minutes)),
  };
};
