const JOYSTICK_KEYS = [
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
];

const joystickKeyOrder = [];

const keyPositionMap = new Map([
  ['DownLeft', [50, 150]],
  ['Down', [100, 150]],
  ['DownRight', [150, 150]],
  ['Left', [50, 100]],
  ['Center', [100, 100]],
  ['Right', [150, 100]],
  ['UpLeft', [50, 50]],
  ['Up', [100, 50]],
  ['UpRight', [150, 50]],
])


function getNewJoystickPos() {
  const lastHeldKey = joystickKeyOrder[joystickKeyOrder.length - 1] ?? null
  const secondLastHeldKey = joystickKeyOrder[joystickKeyOrder.length - 2] ?? null

  switch (lastHeldKey) {
    case 'ArrowUp':
      if (secondLastHeldKey === 'ArrowLeft') {
        return keyPositionMap.get('UpLeft')
      } else if (secondLastHeldKey === 'ArrowRight') {
        return keyPositionMap.get('UpRight')
      } else {
        return keyPositionMap.get('Up')
      }
    case 'ArrowDown':
      if (secondLastHeldKey === 'ArrowLeft') {
        return keyPositionMap.get('DownLeft')
      } else if (secondLastHeldKey === 'ArrowRight') {
        return keyPositionMap.get('DownRight')
      } else {
        return keyPositionMap.get('Down')
      }
    case 'ArrowLeft':
      if (secondLastHeldKey === 'ArrowUp') {
        return keyPositionMap.get('UpLeft')
      } else if (secondLastHeldKey === 'ArrowDown') {
        return keyPositionMap.get('DownLeft')
      } else {
        return keyPositionMap.get('Left')
      }
    case 'ArrowRight':
      if (secondLastHeldKey === 'ArrowUp') {
        return keyPositionMap.get('UpRight')
      } else if (secondLastHeldKey === 'ArrowDown') {
        return keyPositionMap.get('DownRight')
      } else {
        return keyPositionMap.get('Right')
      }
    default:
      return keyPositionMap.get('Center')
  }
}

export function isKeyForJoystick(key) {
  return JOYSTICK_KEYS.includes(key);
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
