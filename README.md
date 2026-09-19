# Kanban Task Management Application

A full-stack Kanban task management application built with Next.js, TypeScript, PostgreSQL, Prisma, and Better Auth.

Users can create boards, organize tasks into columns, manage subtasks, drag tasks between statuses, connect with friends, and collaborate on shared boards.

## Features

### Authentication

- User registration and login
- Secure email and password authentication
- Persistent user sessions
- Protected board routes
- User-specific private data
- Sign-out functionality

### Board Management

- Create boards
- Rename boards
- Delete boards
- Create and remove columns
- Owner-only board structure management
- Responsive board sidebar

### Task Management

- Create tasks
- View task details
- Edit tasks
- Delete tasks
- Add and remove subtasks
- Mark subtasks as completed
- Change task status
- Drag tasks within a column
- Drag tasks between columns
- Persistent task ordering

### Collaboration

- Search for users
- Send friend requests
- Accept or reject friend requests
- Cancel pending requests
- Remove friends
- Invite friends to boards
- Accept or reject board invitations
- Remove board members
- Access shared boards
- Owner and member permission controls

### User Interface

- Responsive desktop and mobile layouts
- Light and dark themes
- Animated modals and menus
- Drag-and-drop interactions
- Loading, validation, and error feedback

## Technology Stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4
- PostgreSQL
- Neon
- Prisma ORM
- Better Auth
- dnd-kit
- Motion
- Zod
- Lucide React

## Permissions

### Board Owner

The board owner can:

- Edit the board name
- Add, rename, and remove columns
- Delete the board
- Invite friends
- Cancel board invitations
- Remove board members
- Create, edit, move, and delete tasks

### Board Member

A shared-board member can:

- View the shared board
- Create tasks
- Edit tasks
- Move tasks
- Delete tasks
- Complete subtasks

A member cannot:

- Edit the board name
- Add or remove columns
- Delete the board
- Invite or remove members

## Environment Variables

Create a `.env` file in the project root:

```env
DATABASE_URL="your-pooled-postgresql-connection-string"
DATABASE_URL_UNPOOLED="your-direct-postgresql-connection-string"
BETTER_AUTH_SECRET="your-generated-secret"
BETTER_AUTH_URL="http://localhost:3000"
```

Generate a secure Better Auth secret with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

Never commit the `.env` file.

## Local Development

Install dependencies:

```bash
npm install
```

Generate the Prisma client:

```bash
npx prisma generate
```

Apply database migrations:

```bash
npx prisma migrate deploy
```

Start the development server:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

## Development Database Changes

When changing the Prisma schema during development, create a migration with:

```bash
npx prisma migrate dev --name migration_name
```

Then regenerate the Prisma client if necessary:

```bash
npx prisma generate
```

## Quality Checks

Run ESLint:

```bash
npm run lint
```

Create a production build:

```bash
npm run build
```

Check dependencies for known vulnerabilities:

```bash
npm audit
```

## Production Deployment

The application can be deployed with Vercel and Neon.

Before deployment:

1. Create or connect a Neon PostgreSQL database.
2. Add all required environment variables to Vercel.
3. Set `BETTER_AUTH_URL` to the deployed application URL.
4. Apply the production migrations with:

```bash
npx prisma migrate deploy
```

5. Deploy the application.
6. Test authentication, boards, tasks, friendships, invitations, and shared-board permissions.

## Project Structure

```text
prisma/
  migrations/
  schema.prisma

src/
  actions/
  app/
  components/
    auth/
    board/
    collaboration/
    friends/
    providers/
    task/
    ui/
  lib/
  types/
```

## Security

- Server actions verify the current authenticated user.
- Board operations verify board ownership.
- Task operations verify board membership.
- Environment files are ignored by Git.
- Database migrations are version controlled.
- Dependency auditing currently reports zero known vulnerabilities.