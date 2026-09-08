/**
 * Public review evidence, quoted verbatim from the public Thumbtack listing
 * (COMPANY.reviewSources.thumbtackProfile) on 2026-09-07. These are shown to
 * visitors on /reviews and in the trust bar; they are deliberately NOT
 * published as Review or AggregateRating markup on the Organization, which
 * search engines treat as self-serving.
 *
 * Never edit the wording or the values: add a new entry when a new review is
 * published, with the date it was captured.
 */
import { COMPANY } from "../../amplify/functions/shared/company";

export type PublicReview = {
  author: string;
  date: string;
  rating: 5;
  text: string;
  source: "Thumbtack";
};

export const THUMBTACK_RATING = { value: "5.0", count: 4, capturedOn: "2026-09-07" } as const;

export const PUBLIC_REVIEWS: readonly PublicReview[] = [
  {
    author: "Diogo d.",
    date: "2026-07-13",
    rating: 5,
    text: "Great experience and very responsive, thank you for the service!",
    source: "Thumbtack",
  },
  {
    author: "Christina A.",
    date: "2026-06-22",
    rating: 5,
    text: "We've had a positive experience working with buzzkill pest control company, as they have consistently provided reliable service and professional communication.",
    source: "Thumbtack",
  },
  {
    author: "Bhavya S.",
    date: "2026-06-19",
    rating: 5,
    text: "Service has been dependable from a business perspective, and communication has always been clear and professional.",
    source: "Thumbtack",
  },
  {
    author: "Matt S.",
    date: "2026-06-19",
    rating: 5,
    text: "They did a great job!",
    source: "Thumbtack",
  },
];

export const REVIEW_LINKS = {
  /** Where the reviews above can be read. */
  thumbtack: COMPANY.reviewSources.thumbtackProfile,
  /** A "leave a review" destination only; it does not display reviews. */
  leaveGoogleReview: COMPANY.reviewSources.googleReviewSubmission,
} as const;
