window.resize = () => {
  var root = document.querySelector(":root");
  var width = window.innerWidth;
  var height = window.innerHeight;
  root.style.setProperty("--vw",width+"px");
  root.style.setProperty("--vh",height+"px");
  root.style.setProperty("--vmin",(width<height?width:height)+"px");
  root.style.setProperty("--vmax",(width>height?width:height)+"px");
}
window.resize();
window.addEventListener("resize",window.resize);