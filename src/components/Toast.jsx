import { useEffect } from "react";
import { Ic } from "./icons";

function Toast({ message, type, onClose }) {
  useEffect(()=>{ const t=setTimeout(onClose,3200); return ()=>clearTimeout(t); },[onClose]);
  return (
    <div className="toast" role="alert" aria-live="assertive" aria-atomic="true">
      <Ic n={type==="err"?"x":"check"} s={13} c={type==="err"?"#F87171":"#4ADE80"}/>
      {message}
    </div>
  );
}

export default Toast;
