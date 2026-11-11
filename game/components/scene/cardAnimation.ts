export type MotionStyle = "drive" | "fast" | "turbo" | "shortcut" | "overtake" | "sprint";
export const unit = (n:number) => Math.max(0,Math.min(1,n));
export const smooth = (n:number) => {const t=unit(n);return t*t*(3-2*t);};

/** Integrated cosine velocity: starts and ends at rest, with a sustained middle. */
export function driveProgress(style:MotionStyle,progress:number){
  const t=unit(progress),a=style==='turbo'?.13:style==='fast'?.18:.23,b=style==='turbo'?.22:.26,total=1-(a+b)/2;
  if(t<a)return (.5*t-a/(2*Math.PI)*Math.sin(Math.PI*t/a))/total;
  if(t<=1-b)return (t-a/2)/total;
  const q=t-(1-b);return ((1-b)-a/2+q/2+b/(2*Math.PI)*Math.sin(Math.PI*q/b))/total;
}
export function boostEnvelope(progress:number){return smooth(progress/.12)*(1-smooth((progress-.70)/.30));}
export function punctureAmount(age:number,recoveryAge?:number){return recoveryAge===undefined?smooth((age-180)/720):1-smooth(recoveryAge/950);}
export function collisionPose(age:number,recoveryAge?:number){
  const impact=smooth(age/95),settle=1-Math.exp(-Math.max(0,age)/260),recover=recoveryAge===undefined?1:1-smooth(recoveryAge/1000);
  return {yaw:(.12*settle+.08*Math.sin(age/105)*Math.exp(-age/350)*impact)*recover,roll:(.025*settle+.065*Math.sin(age/85)*Math.exp(-age/300)*impact)*recover};
}

/** Pull out, hold the passing lane, then merge back; steering reverses on return. */
export function overtakePose(progress:number,lane:number){
  const t=unit(progress),destination=lane>=0?-.65:.65;
  const enter=unit((t-.04)/.24),leave=unit((t-.86)/.14);
  const offset=(destination-lane)*(smooth(enter)-smooth(leave));
  const steering=(destination-lane)*(6*enter*(1-enter)/.24-6*leave*(1-leave)/.14);
  return {offset,yaw:Math.atan(steering*.022)};
}
