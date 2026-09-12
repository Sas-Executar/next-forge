import { getPost, getPostsMeta } from "./lib/posts";

export type { Post, PostMeta } from "./lib/posts";

/* -------------------------------------------------------------------------------------------------
 * Content source: local MDX files under packages/cms/content/{blog,legal}.
 * Edited directly in the repo via a normal PR — no CMS account/token needed.
 * -----------------------------------------------------------------------------------------------*/

export const blog = {
  getPosts: () => Promise.resolve(getPostsMeta("blog")),

  getLatestPost: () => {
    const [latest] = getPostsMeta("blog");

    if (!latest) {
      return Promise.resolve(null);
    }

    return getPost("blog", latest.slug);
  },

  getPost: (slug: string) => getPost("blog", slug),
};

export const legal = {
  getPostsMeta: () => Promise.resolve(getPostsMeta("legal")),

  getPosts: () => Promise.resolve(getPostsMeta("legal")),

  getPost: (slug: string) => getPost("legal", slug),
};
