export type TurntableView = 'front'|'side'|'back';

export function normalizeAngle(value:number):number {
  if(!Number.isFinite(value))return 0;
  return ((Math.round(value)%360)+360)%360;
}

export function turntableView(value:number):TurntableView {
  const angle=normalizeAngle(value);
  if(angle>=75&&angle<=105||angle>=255&&angle<=285)return 'side';
  return angle>105&&angle<255?'back':'front';
}
