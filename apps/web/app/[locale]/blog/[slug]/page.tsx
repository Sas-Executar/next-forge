import { ArrowLeftIcon } from "@radix-ui/react-icons";
import { blog } from "@repo/cms";
import { JsonLd } from "@repo/seo/json-ld";
import { createMetadata } from "@repo/seo/metadata";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { env } from "@/env";

const protocol = env.VERCEL_PROJECT_PRODUCTION_URL?.startsWith("https")
  ? "https"
  : "http";
const url = new URL(`${protocol}://${env.VERCEL_PROJECT_PRODUCTION_URL}`);

interface BlogPostProperties {
  readonly params: Promise<{
    slug: string;
  }>;
}

export const generateMetadata = async ({
  params,
}: BlogPostProperties): Promise<Metadata> => {
  const { slug } = await params;
  const post = await blog.getPost(slug);

  if (!post) {
    return {};
  }

  return createMetadata({
    title: post.title,
    description: post.description,
    image: post.image,
  });
};

export const generateStaticParams = async (): Promise<{ slug: string }[]> => {
  const posts = await blog.getPosts();

  return posts.map(({ slug }) => ({ slug }));
};

const BlogPost = async ({ params }: BlogPostProperties) => {
  const { slug } = await params;
  const post = await blog.getPost(slug);

  if (!post) {
    notFound();
  }

  return (
    <>
      <JsonLd
        code={{
          "@type": "BlogPosting",
          "@context": "https://schema.org",
          datePublished: post.date,
          description: post.description,
          mainEntityOfPage: {
            "@type": "WebPage",
            "@id": new URL(`/blog/${post.slug}`, url).toString(),
          },
          headline: post.title,
          image: post.image,
          dateModified: post.date,
          isAccessibleForFree: true,
        }}
      />
      <div className="container mx-auto py-16">
        <Link
          className="mb-4 inline-flex items-center gap-1 text-muted-foreground text-sm focus:underline focus:outline-none"
          href="/blog"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Back to Blog
        </Link>
        <div className="mt-16 flex flex-col items-start gap-8">
          <div className="prose prose-neutral dark:prose-invert w-full max-w-none">
            <h1 className="scroll-m-20 text-balance font-extrabold text-4xl tracking-tight lg:text-5xl">
              {post.title}
            </h1>
            <p className="text-balance leading-7 [&:not(:first-child)]:mt-6">
              {post.description}
            </p>
            <p className="text-muted-foreground text-sm">
              {new Date(post.date).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}{" "}
              · {post.readingTimeMinutes} min read
            </p>
            {post.image ? (
              // biome-ignore lint/performance/noImgElement: local content image, no remote optimizer configured
              <img
                alt=""
                className="my-16 h-full w-full rounded-xl"
                height={630}
                src={post.image}
                width={1200}
              />
            ) : null}
            <div className="mx-auto max-w-prose">{post.content}</div>
          </div>
        </div>
      </div>
    </>
  );
};

export default BlogPost;
