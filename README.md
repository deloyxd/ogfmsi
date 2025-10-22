# OGFMSI - Online Gym Facility Management with Sales and Inventory

OGFMSI (Online Gym Facility Management with Sales and Inventory) is a comprehensive web application being developed for Fitworx Gym. The system aims to replace current manual processes with an efficient digital solution, enhancing operational efficiency and user experience.

---

# COLLABATOR PATTERNS FOR OGFMSI

---

## **Initial setup - Clone the project:**

- `git clone https://github.com/deloyxd/ogfmsi.git`

**Close vsc (if its open), and open the cloned directory named `ogfmsi` in vsc**

## **Create your own branch (one time action):**

- `git checkout -b [your-branch-name]` example: `git checkout -b jest`
- `npm install` to install necessary files
- create a file in root: `.gitignore` then copy paste this: `node_modules/`

## **Push your code to main branch (repeatable):**

- `git add .`
- `git commit -m "[your-commit-message (see below for our pattern)]"`
- example: `git commit -m "Fix: Login form ui"`
- `git push origin [your-branch-name]`

---

## **Commits:**

- Write clear and concise commit messages. If its a new code, use `"Feat: ..."`, or if its a fixing of existing code, use `"Fix: ..."`
- example new feature: `"Feat: Add basic header component"`
- example fixing bug: `"Fix: Correct dashboard layout on mobile"`

## **Keep your branch updated:**

**If the main branch gets updated while you're working, you can sync your branch:**

- `git stash`
- `git checkout main`
- `git pull origin main`
- `git checkout [your-branch-name]`
- `git merge main`
- `git stash pop`

**Reset from last pull:**

- `git checkout [your-branch-name]`
- `git reset --hard ORIG_HEAD`
- `git clean -fd`

**Database connection:**

host: `mysql-110826b3-gymfacilitymanagement.b.aivencloud.com`
username: `avnadmin`
database: `defaultdb`
port: `26818`
password: `AVNS_SvAOkqPaEQUpBykhli9`
