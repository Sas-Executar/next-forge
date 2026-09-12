import { ArrowLeftIcon } from "@radix-ui/react-icons";
import { legal } from "@repo/cms";
import { createMetadata } from "@repo/seo/metadata";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

interface LegalPageProperties {
  readonly params: Promise<{
    slug: string;
  }>;
}

export const generateMetadata = async ({
  params,
}: LegalPageProperties): Promise<Metadata> => {
  const { slug } = await params;
  const post = await legal.getPost(slug);

  if (!post) {
    return {};
  }

  return createMetadata({
    title: post.title,
    description: post.description,
  });
};

export const generateStaticParams = async (): Promise<{ slug: string }[]> => {
  const posts = await legal.getPosts();

  return posts.map(({ slug }) => ({ slug }));
};

const LegalPage = async ({ params }: LegalPageProperties) => {
  const { slug } = await params;
  const post = await legal.getPost(slug);

  if (!post) {
    notFound();
  }

  return (
    <div className="container max-w-5xl py-16">
      <Link
        className="mb-4 inline-flex items-center gap-1 text-muted-foreground text-sm focus:underline focus:outline-none"
        href="/"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        Back to Home
      </Link>
      <h1 className="scroll-m-20 text-balance font-extrabold text-4xl tracking-tight lg:text-5xl">
        {post.title}
      </h1>
      <p className="text-balance leading-7 [&:not(:first-child)]:mt-6">
        {post.description}
      </p>
      <div className="prose prose-neutral dark:prose-invert mt-16">
        {post.content}
      </div>
    </div>
  );
};

export default LegalPage;
