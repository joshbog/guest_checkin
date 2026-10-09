# Guest check-in

A door check-in site for an invitation-only event. Every guest gets a pass with their own QR code. At the door, a helper scans the pass with a phone camera and the site answers: admit, already used, or not on the list.

It is a static site (this folder) with a Firebase project behind it for sign-in and the guest list. Nothing about your event or your guests is stored in this repository.

## What is in this folder

| File | What it is |
| --- | --- |
| `index.html` | The whole site: the door scanner, Manage guests and Settings. |
| `data.js` | The connection to Firebase: Google sign-in, the guest list, saving files. |
| `firebase-config.js` | Where you paste your Firebase project's details. |
| `firestore.rules` | The database's access rules. You paste these into the Firebase console. |
| `vendor/` | Third-party libraries, kept here so the site does not depend on other servers at the door. |

## Set it up

### 1. Create the Firebase project

1. At [console.firebase.google.com](https://console.firebase.google.com), create a project. Google Analytics is not needed.
2. **Build → Firestore Database → Create database.** Choose production mode and a location near you.
3. **Build → Authentication → Get started → Sign-in method → Google.** Enable it and save.
4. **Project settings (gear icon) → Your apps → Web (`</>`).** Register an app, then copy the `firebaseConfig = { ... }` block.

### 2. Connect the site to it

Open `firebase-config.js` and replace `null` with the object you copied:

```js
window.FIREBASE_CONFIG = {
  apiKey: "...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "..."
};
```

These values are not secret. They only tell the page which project to talk to. What protects the guest list is the sign-in and the rules in the next step.

### 3. Publish the access rules

In the Firebase console open **Firestore Database → Rules**, replace everything there with the contents of `firestore.rules`, and press **Publish**.

### 4. Make yourself the first organiser

In **Firestore Database → Data**:

1. **Start collection**, with the collection ID `staff`.
2. Document ID: your Google address, in lower case (for example `you@gmail.com`).
3. Add one field: name `role`, type string, value `organiser`. Save.

After this you add everyone else from the site's own Settings.

### 5. Put the site on GitHub Pages

1. Push this folder to a public GitHub repository.
2. In the repository open **Settings → Pages**, choose **Deploy from a branch**, branch `main`, folder `/ (root)`, and save.
3. After a minute the site is live at `https://<your-username>.github.io/<repository-name>/`.

### 6. Allow the site's address to sign in

In the Firebase console open **Authentication → Settings → Authorized domains → Add domain** and add `<your-username>.github.io`.

## Using it

- **Sign in** with the Google account you made an organiser.
- **Manage guests → Settings**: set the event details and colours, set the 6-digit passcode, and add the people who will help at the door by their Google address.
- **Add guests** one at a time, or upload an Excel file. A sheet with `Guest name` and `List` columns works; so does one column of names for each list headed `Groom`, `Bride` and `Vendors`. The `List` column says `Groom`, `Bride` or `Vendor`. If the sheet has an `Entry code` column, those codes are kept.
- **WhatsApp**: add each guest's WhatsApp number (a `WhatsApp number` or `Phone` column in the upload, or Edit on their row; numbers without a country code use the one in Settings, 234 to start with). The WhatsApp button on a guest copies their pass picture and opens a WhatsApp chat to their number with the message from Settings, WhatsApp, already typed (`{{Fullname}}` becomes their name); paste the pass in and send. Numbers live in the `contacts` collection, which only organisers can read, so door helpers never see them; this needs the `contacts` rule in `firestore.rules`.
- **Guest types** (Settings, Guest types): Groom's guest, Bride's guest and Vendor to start with. Add your own, rename one (its guests move with it) or remove one nobody is under. An upload matches a column or `List` value to a type by its name or key word, for example `Family`. The guest list at the door and in Manage guests can be filtered by type.
- **Send each guest their pass**: every guest's row has their QR code, with Download and Share.
- **At the door**: tap Scan a pass and hold each guest's QR code in front of the camera.
- **Who checked whom in**: give each person a name in Settings → People. Every check-in records who made it, and their name shows beside the guest at the door, in the guest list and in the downloaded list. Without a name, the name on their Google account is used.

## Who can do what

| | Organiser | Door helper | Anyone else |
| --- | --- | --- | --- |
| See the guest list | Yes | Yes | No |
| Check a guest in | Yes | Yes | No |
| Add, edit or remove guests | Yes | No | No |
| Clear a check-in | Yes | No | No |
| Change settings and helpers | Yes | No | No |

These limits are enforced by the database rules, not only by which buttons the page shows.

When `firestore.rules` changes, publish it again in the Firebase console (**Firestore Database → Rules**, replace everything, **Publish**). The site keeps working with the older rules; it just cannot record who checked a guest in until they are published.

## Good to know

- The door phone needs a signal. A pass is admitted by the database in one step, so the same pass cannot be let in twice, even at two doors in the same second.
- A pass that stays in front of the camera is read once. It has to leave the picture for a few seconds before it is read again.
- Changing a guest's name keeps their code. "New QR code" replaces it, and the old pass stops working.
- Firebase's free plan is far more than one event needs.
