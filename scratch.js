const usersEnv = "82465131:default_user, 4269:tonia";
const pin = "4269";
let userId = null;
if (usersEnv && pin) {
  const pairs = usersEnv.split(',').map(s => s.trim().split(':'));
  const userMatch = pairs.find(([p]) => p === pin.trim());
  if (userMatch && userMatch[1]) {
    userId = userMatch[1].trim();
  }
}
console.log("userId:", userId);
