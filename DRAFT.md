In this project, we are building a SaaS service for generating children's books
in PDF format. The target audience is the children's parents, who want to create
customized books with useful and educational stories for their children.

The technology stack is NestJS for the backend, Next.js for the frontend, Prisma
for database access, Redis and BullMQ for queues, and Garage for S3-compatible
storage. You should propose the architectural decisions.

Authentication must be implemented through Google.

The project's business entities include users, templates, books, children (one
parent can have multiple children), illustrations, book pages, subscriptions,
ratings, and possibly a referral program. There should also be a `jobs` table
for tracking queues used to generate the books and illustrations.

The database is PostgreSQL. Docker is used for the environment. Redis can also
be used. Garage is used as S3-compatible storage; for production testing, any
production-ready storage can be used.
