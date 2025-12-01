const joystickKeyOrder = [];

const keyPositionMap = new Map([
  ['1', [50, 150]],
  ['2', [100, 150]],
  ['3', [150, 150]],
  ['4', [50, 100]],
  ['5', [100, 100]],
  ['6', [150, 100]],
  ['7', [50, 50]],
  ['8', [100, 50]],
  ['9', [150, 50]], 
])

function lastHeldKey() {
  return joystickKeyOrder[joystickKeyOrder.length - 1] || null;
}

function getNewJoystickPos() {
  const newPos = keyPositionMap.get(lastHeldKey())
  return newPos ?? [100, 100]
}

export function isKeyForJoystick(key) {
  return keyPositionMap.has(key);
}

export function handleJoystickKeydown(key) {
  if (!joystickKeyOrder.includes(key)) {
    joystickKeyOrder.push(key);
  }
  return getNewJoystickPos();
}

export function handleJoystickKeyup(key) {
  const i = joystickKeyOrder.indexOf(key);
  if (i !== -1) {
    joystickKeyOrder.splice(i, 1);
  }
  return getNewJoystickPos();
}
