
---

## 🧩 **E-SERVICES-ADD – Project Progress Notes**

### 🖥️ Back-end

* ✔️ **PHP 8.x**
* ✔️ **Laravel 12**
* ✔️ **API RESTful (JSON)**
* ✔️ **Laravel Sanctum (Cookies Auth)**
* ✔️ **Authentication**

  * ✔️ Register
  * ✔️ Login
  * ✔️ Logout
  * ✔️ /api/me
* ✔️ **Role & Permission System**

  * ✔️ Roles (client, reception, agent, responsable, director, admin)
  * ✔️ Role middleware (`role:xxx`)
  * ✔️ Permission middleware (`perm:xxx`)
* ✔️ **PostgreSQL Connection**
* ✔️ **Users table**
* ✔️ **Roles / Permissions tables**
* ✔️ **Pivot tables (role_user, permission_role)**
* ✔️ **Seeders (roles & permissions)**

---

### 🎨 Front-end

* ✔️ **HTML5**
* ✔️ **CSS3**
* ✔️ **JavaScript**
* ✔️ **Bootstrap 5**
* ✔️ **Tailwind CSS**
* ✔️ **AJAX / Fetch API**
* ✔️ **Auth Test UI**

  * ✔️ Login form
  * ✔️ Register form
  * ✔️ Welcome page (Welcome Mr. Name)
  * ✔️ Role display (Role: client / admin / …)
  * ✔️ Logout button
  * ✔️ Role-based test buttons

---

### 🗄️ Database

* ✔️ **PostgreSQL**
* ✔️ Tables created via migrations
* ✔️ Relations tested (User ↔ Roles ↔ Permissions)
* ✔️ Data tested via Tinker & API

---

### 🛠️ Tools

* ✔️ **Git / GitHub**
* ✔️ **Postman (API tests)**
* ✔️ **VS Code**
* ✔️ **pgAdmin**
* ✔️ **Laravel Artisan**
* ✔️ **Composer**

---

### 🧪 Tests & Validation

* ✔️ Auth tested with multiple users
* ✔️ Roles access tested (client/admin/etc.)
* ✔️ Permissions access tested
* ✔️ Unauthorized access blocked (403)
* ✔️ Routes protected with Sanctum

---

## ✅ **Status Global**

🟢 **First Etap COMPLETED 100%**

---

📌 **Next Etap**

* Services & Requests (core E-Services)
* Workflow status (DRAFT → SUBMITTED → APPROVED…)
* File upload (documents)
* Notifications
* Admin dashboard
* API documentation (Swagger / Postman collection)




les commandes : 

* show all users  *

php artisan tinker

\App\Models\User::all();

\App\Models\User::select('id','name','email')->get();


del /q bootstrap\cache\*.php
php artisan config:clear


============================================================
E-SERVICES-ADD - DIGITAL ADMINISTRATIVE SERVICES PLATFORM
============================================================

PROJECT OVERVIEW
------------------------------------------------------------
Project title:
E-SERVICES-ADD

Short description:
E-SERVICES-ADD is a full-stack digital services platform developed to manage online administrative service requests. It allows citizens/clients to browse available services, submit requests, upload documents, track request status, and communicate with staff. On the administration side, authorized users can manage services, dynamic service forms, agencies, employees, clients, requests, dashboards, and email notifications.

Context and objectives:
The objective of the project is to digitalize the submission and processing of service requests inside an organized administrative environment. The platform centralizes request management, improves follow-up, reduces manual processing, and provides traceability through request histories, comments, documents, and role-based access control.

Main objectives:
- Provide an online portal for clients to consult services and submit requests.
- Provide a back-office for administrators, agency managers, and agents.
- Manage agencies, users, services, dynamic fields, and requests.
- Support request workflow tracking from draft/submission to approval, rejection, or closure.
- Notify clients through email when important actions happen.
- Secure access using authentication, roles, permissions, and protected routes.


FEATURES
------------------------------------------------------------
1. Authentication
- User registration with name, email, CIN, password, and password confirmation.
- Login and logout using Laravel session authentication.
- Automatic login after registration.
- Current user endpoint through /api/me.
- Password reset flow using an email code.
- CSRF-protected SPA authentication through Laravel Sanctum.

2. User management
- Administrator can list, create, view, update, and delete users.
- Users are linked to roles and may also be linked to agencies.
- Client directory is available for staff use.
- Profile update endpoints are available for authenticated users and clients.

3. Roles and permissions
Detected roles from the backend seeders:
- client (CLT): Client portal user.
- reception (REC): Reception role with request viewing access.
- agent (AGT): Agency agent responsible for request processing.
- responsable (RSP): Agency manager responsible for service management.
- director (DIR): Director role with request workflow access.
- admin (ADM): Administrator with full access.

Detected permissions:
- manage_services
- view_all_requests
- assign_requests
- change_status
- request_needs_info
- close_request
- manage_users_roles

4. Agencies management
- Administrator can create, list, view, update, and delete agencies.
- Agencies are used to organize staff and scope responsibilities.
- Staff and services can be linked to agencies.

5. Employees and staff management
- Staff roles include administrator, responsable, agent, reception, and director.
- Staff users access protected back-office sections depending on role.
- Agent and responsable users can access request/service features according to permissions.

6. Clients management
- Clients can register, authenticate, update their profile, and access the client portal.
- Staff can access a client directory.
- Client-related email communication is stored and managed.

7. Services management
- Administrators and responsables can create, update, delete, and activate/deactivate services.
- Public service catalog is available through API endpoints.
- Services support detailed information such as description, details, publication status, agency/responsable assignment, deadlines, and publication dates.

8. Dynamic service fields
- Each service can have its own dynamic form fields.
- Supported field types detected in the implementation notes include: text, number, date, select, textarea, file, and email.
- Fields can be marked as required or optional.
- Select fields can store options in JSON format.
- Fields can be reordered.

9. Requests management
- Clients can create, update, submit, delete, and track requests.
- Public guests can also create and submit requests without an account.
- Staff can list, view, create, update, assign, approve, reject, comment on, and activate/deactivate requests.
- Requests support documents, comments, history tracking, assigned agents, and status changes.

10. Request workflow
The project contains a workflow around request processing. Implementation notes describe the following status logic:
DRAFT -> SUBMITTED -> IN_REVIEW -> NEEDS_INFO / APPROVED / REJECTED -> CLOSED

Typical actions include:
- Create draft request.
- Submit request.
- Assign request to an agent.
- Mark request as viewed.
- Start review.
- Request additional information.
- Add comments.
- Upload/download documents.
- Approve or reject request.
- Close request.

11. Documents management
- Clients, guests, employees, and admins can upload or download request documents through protected endpoints.
- Documents are linked to requests.
- Download access is separated by context: guest, client, employee, and admin.

12. Comments and communication
- Clients, guests, agents, and admins can add comments to requests.
- Comments support follow-up and communication when more information is required.

13. Email notifications
- Backend supports email notifications for password reset, request activity, service publication, and staff-client messages.
- EmailJS integration is available through Laravel and React.
- Staff can send client emails through the back-office.
- Public EmailJS configuration endpoint exists for the frontend contact page.
- Email sending can be enabled or disabled through environment variables.

14. Dashboard and statistics
- Admin/staff dashboard summary endpoint is available.
- Frontend includes admin dashboard pages and dashboard UI.
- Dashboard access is role-protected for admin, responsable, and agent users.

15. Settings management
- Frontend includes a settings page under the admin layout.
- Access is restricted to admin and responsable roles.

16. Public contact page
- React frontend includes a contact page.
- EmailJS can be used from the browser or loaded from the backend public configuration endpoint.

17. Responsive and animated UI
- React frontend uses CSS, Framer Motion, GSAP, and a branded layout system.
- The UI includes login, register, forgot password, client portal, staff/admin portal, dashboards, and management pages.


TECHNOLOGY STACK
------------------------------------------------------------
Frontend:
- React 19
- Vite 7
- JavaScript / JSX
- CSS
- React Router DOM
- Axios
- EmailJS browser integration through emailjs-com
- Framer Motion
- GSAP
- ESLint

Backend:
- PHP 8.2+
- Laravel 12
- Laravel Sanctum 4
- Laravel session authentication
- REST API architecture
- Laravel validation Form Requests
- Laravel Eloquent ORM
- Laravel migrations and seeders
- Laravel Mail / Mailable classes
- Laravel Artisan commands
- PHPUnit for tests

Database:
- Default environment configuration uses SQLite: DB_CONNECTION=sqlite
- A SQLite database file exists at: 03_Backend_Laravel/eservices-api/database/database.sqlite
- The Laravel database configuration also supports other Laravel drivers such as MySQL/PostgreSQL if configured in .env.
- Some migrations include MySQL/PostgreSQL-specific handling for service field email types.

Other tools:
- Composer for PHP dependency management
- NPM for JavaScript dependency management
- Git / GitHub for version control
- EmailJS for external email delivery
- Laravel Pint for code style
- Laravel Pail for logs
- Laravel Sail available as a development dependency
- Vite build system


PROJECT ARCHITECTURE
------------------------------------------------------------
The project follows a separated frontend/backend architecture:

1. Backend API
Path:
03_Backend_Laravel/eservices-api

Description:
Laravel application exposing REST API endpoints for authentication, services, users, agencies, requests, documents, dashboards, email notifications, roles, and permissions.

Main backend layers:
- routes/api.php: API routes for public, client, employee, staff, and admin features.
- routes/web.php: web redirects and authentication endpoints.
- app/Http/Controllers: business logic grouped by Admin, Client, Employee, Public, Staff, and Auth.
- app/Models: Eloquent models for users, roles, permissions, agencies, services, requests, documents, comments, histories, and staff emails.
- app/Http/Middleware: role and permission middleware.
- app/Http/Requests: validation classes for services and requests.
- app/Mail: email templates and mailable classes.
- app/Services: EmailJS sending and request notification services.
- database/migrations: database schema.
- database/seeders: roles, permissions, users, agencies, services, and request sample data.

2. Frontend SPA
Path:
04_Frontend_React/eservices-front

Description:
React single-page application consuming the Laravel API. It contains public pages, authentication pages, client portal, employee portal, and admin/staff back-office.

Main frontend layers:
- src/App.jsx: application routes.
- src/api: Axios API clients for auth, admin, client, employee, requests, services, documents, profile, and staff emails.
- src/auth/AuthContext.jsx: authentication state and user session management.
- src/routes/Guards.jsx: frontend route protection by role.
- src/pages: page components for login, registration, contact, dashboard, admin, client, and employee areas.
- src/components: reusable UI components, admin layout, brand components, notifications, modals, and login atmosphere.
- src/styles and src/index.css: global and branded styling.

3. Documentation and project folders
The root project also includes folders reserved for documentation, conception, database resources, API documentation, tests, and deployment.


PROJECT STRUCTURE
------------------------------------------------------------
E-SERVICES-ADD/
  Main project folder.

01_Documentation/
  Documentation folder for general project documents.

02_Conception/
  Conception resources, including UML, ERD, and UI mockup folders.

03_Backend_Laravel/
  Backend workspace.

03_Backend_Laravel/eservices-api/
  Laravel 12 REST API application.

03_Backend_Laravel/eservices-api/app/Http/Controllers/Admin/
  Admin controllers for users, agencies, services, service fields, dashboard, and requests.

03_Backend_Laravel/eservices-api/app/Http/Controllers/Client/
  Client portal controllers for services, requests, and profile.

03_Backend_Laravel/eservices-api/app/Http/Controllers/Employee/
  Employee request dashboard and processing controllers.

03_Backend_Laravel/eservices-api/app/Http/Controllers/Public/
  Public endpoints such as guest requests and EmailJS public configuration.

03_Backend_Laravel/eservices-api/app/Http/Controllers/Staff/
  Staff email communication and new request endpoints.

03_Backend_Laravel/eservices-api/app/Models/
  Eloquent models for the main business entities.

03_Backend_Laravel/eservices-api/database/migrations/
  Database schema migrations.

03_Backend_Laravel/eservices-api/database/seeders/
  Initial data and test data seeders.

03_Backend_Laravel/eservices-api/routes/
  API and web route definitions.

04_Frontend_React/
  Frontend workspace.

04_Frontend_React/eservices-front/
  React/Vite frontend application.

04_Frontend_React/eservices-front/src/api/
  Frontend API service modules.

04_Frontend_React/eservices-front/src/auth/
  Authentication context and session state.

04_Frontend_React/eservices-front/src/routes/
  Route guards and role-based navigation protection.

04_Frontend_React/eservices-front/src/pages/
  Main frontend pages.

04_Frontend_React/eservices-front/src/pages/admin/
  Admin/staff dashboard, users, agencies, services, requests, settings, and client emails.

04_Frontend_React/eservices-front/src/pages/client/
  Client services catalog, request creation, request tracking, and profile.

04_Frontend_React/eservices-front/src/pages/employee/
  Employee dashboard and assigned request processing.

05_Database/
  Database-related project resources.

06_API_Documentation/
  API documentation resources.

07_Tests/
  Testing resources.

08_Deployment/
  Deployment resources.


INSTALLATION GUIDE
------------------------------------------------------------
Requirements:
- PHP 8.2 or higher
- Composer
- Node.js
- NPM
- SQLite by default, or MySQL/PostgreSQL if you choose to reconfigure Laravel .env
- Git

Recommended local ports:
- Laravel backend: http://localhost:8000
- React frontend: http://localhost:5173

1. Clone the repository
------------------------------------------------------------
git clone <repository-url>
cd E-SERVICES-ADD

2. Backend installation
------------------------------------------------------------
Go to the Laravel backend folder:

cd 03_Backend_Laravel/eservices-api

Install PHP dependencies:

composer install

Create environment file:

cp .env.example .env

Generate application key:

php artisan key:generate

Configure the database.
The default .env.example uses SQLite:

DB_CONNECTION=sqlite

Make sure the SQLite database file exists:

mkdir -p database
touch database/database.sqlite

Run migrations:

php artisan migrate

Run seeders:

php artisan db:seed

Start the backend server:

php artisan serve

The backend should run at:
http://localhost:8000

3. Frontend installation
------------------------------------------------------------
Open a new terminal and go to the React frontend folder:

cd 04_Frontend_React/eservices-front

Install JavaScript dependencies:

npm install

Create environment file:

cp .env.example .env

Check the API base URL in .env:

VITE_API_BASE_URL=http://localhost:8000

Start the development server:

npm run dev

The frontend should run at:
http://localhost:5173

4. EmailJS configuration (optional)
------------------------------------------------------------
Backend .env variables:

EMAILJS_ENABLED=false
EMAILJS_SERVICE_ID=
EMAILJS_TEMPLATE_ID=
EMAILJS_PUBLIC_KEY=
EMAILJS_PRIVATE_KEY=

Frontend .env variables:

VITE_EMAILJS_SERVICE_ID=
VITE_EMAILJS_TEMPLATE_ID=
VITE_EMAILJS_PUBLIC_KEY=

If EmailJS is disabled, Laravel can use the configured mailer. With MAIL_MAILER=log, emails are written to Laravel logs instead of being sent to a real inbox.

5. Useful Laravel commands
------------------------------------------------------------
Clear configuration and cache:

php artisan config:clear
php artisan cache:clear
php artisan route:clear

Run tests:

php artisan test

Run queue worker if queue-based mail or jobs are enabled:

php artisan queue:work

Run scheduler locally if scheduled service publication notifications are used:

php artisan schedule:work

6. Useful NPM commands
------------------------------------------------------------
Start development server:

npm run dev

Build production assets:

npm run build

Preview production build:

npm run preview

Run linting:

npm run lint


API INFORMATION
------------------------------------------------------------
The backend exposes a REST API using Laravel routes.

Main API groups:

1. Public routes
- GET /api/services
- GET /api/services/{id}
- GET /api/public/emailjs-config
- POST /api/password/forgot
- POST /api/password/reset
- POST /api/public/requests
- PUT /api/public/requests/{id}
- POST /api/public/requests/{id}/submit
- POST /api/public/requests/{id}/documents
- POST /api/public/requests/{id}/comments

2. Authenticated user routes
- GET /api/me
- PUT /api/me
- Role and permission test endpoints.

3. Client routes
Prefix: /api/client
- List client requests.
- Create and update requests.
- Submit requests.
- Upload and download request documents.
- Add comments.
- Update client profile.

4. Employee routes
Prefix: /api/employee
- Employee dashboard.
- List agents.
- List and view requests.
- Take/start review of requests.
- Request additional information.
- Approve or reject requests.
- Add comments.
- Download documents.

5. Staff routes
Prefix: /api/staff
- Client emails management.
- New requests notification/listing.

6. Admin routes
Prefix: /api/admin
- Users and clients directory.
- Roles listing.
- Agencies CRUD.
- Services CRUD.
- Service fields CRUD and reorder.
- Dashboard summary.
- Requests CRUD and workflow actions.

Authentication method:
- Laravel Sanctum is used for SPA authentication.
- Axios is configured with withCredentials and XSRF support.
- CSRF cookie is retrieved before protected state-changing requests.
- Protected routes use auth:sanctum middleware.
- Role middleware controls access using role names.
- Permission middleware controls access using permission names.


USER ROLES
------------------------------------------------------------
1. Administrator - admin / ADM
Main responsibilities:
- Full platform administration.
- Manage users, roles, agencies, services, service fields, requests, dashboard, settings, and client emails.
- Has all detected permissions.

2. Responsable d'agence - responsable / RSP
Main responsibilities:
- Manage services.
- Access dashboard and settings with limited role-based access.
- Participate in request management according to configured routes.

3. Agent d'agence - agent / AGT
Main responsibilities:
- Process requests.
- View assigned or authorized requests.
- Assign, change status, request information, close, approve/reject, and comment depending on backend permissions.

4. Client - client / CLT
Main responsibilities:
- Register/login.
- Browse services.
- Submit requests.
- Upload documents.
- Track request progress.
- Add comments.
- Manage profile.

5. Reception - reception / REC
Main responsibilities:
- View request information according to permissions.
- Access employee portal features when allowed by frontend guards.

6. Director - director / DIR
Main responsibilities:
- View and process requests according to permissions.
- Access employee dashboard routes in the frontend.


SECURITY
------------------------------------------------------------
Authentication security:
- Laravel session authentication is used for login/logout.
- Laravel Sanctum protects SPA API routes.
- CSRF protection is enabled using XSRF cookies and headers.
- Axios is configured with credentials and XSRF token support.

Authorization security:
- Backend role middleware protects role-specific endpoints.
- Backend permission middleware protects permission-specific endpoints.
- Frontend route guards prevent users from accessing unauthorized pages.
- Admin, staff, client, and employee spaces are separated.

Data validation:
- Laravel Form Request classes validate service, service field, request, assignment, and approval/rejection data.
- Registration validates name, email uniqueness, CIN, password length, and password confirmation.

Request and document security:
- Document downloads are separated by context: guest, client, employee, and admin.
- Request access is scoped by role and endpoint.
- Guest requests are handled through public-specific routes.

Email and configuration security:
- EmailJS credentials are stored through environment variables or backend configuration.
- Public EmailJS endpoint only exposes public configuration intended for frontend usage.
- Sensitive .env files should not be committed to GitHub.

Important recommendation:
Before publishing the repository, remove generated folders and local/private files from Git tracking when applicable:
- node_modules/
- vendor/
- .env
- database/database.sqlite if it contains real/private data
- .DS_Store
- storage/logs/
- bootstrap/cache/


DEFAULT TEST DATA
------------------------------------------------------------
The backend includes seeders that can create test users and roles.
Detected sample users from AdminUserSeeder:

Admin:
- Email: admin@test.com
- Password: admin123

Client:
- Email: client@test.com
- Password: client123

Use these only for local development and testing. Change or remove them before production deployment.


CONCLUSION
------------------------------------------------------------
E-SERVICES-ADD is a complete full-stack platform for digital administrative service request management. It combines a Laravel REST API with a React/Vite single-page application and includes authentication, role-based access control, dynamic service forms, request workflows, document management, comments, dashboards, agencies, users, and email notifications.

The project is structured to support a real administrative workflow: clients submit requests, staff process them, managers supervise services, and administrators manage the full system. With its modular backend and protected frontend routes, the platform can be extended with additional services, reporting, deployment automation, API documentation, and production-grade notification channels.
