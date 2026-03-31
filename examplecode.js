loopAt(3,197,4)// QE2CEh66gTg
loopAt(2,164.57,0.2)//QE2CEh66gTg
loopAt(1,154,0.3)//O-bjTfYILPs
loopAt(0,33,0.5)//6auwxRuFjZk

loopAt(3,197,4)// QE2CEh66gTg
loopAt(2,334,2)//QE2CEh66gTg
loopAt(1,345,6)//QE2CEh66gTg
loopAt(0,225,4)//QE2CEh66gTg


createGrid(2,2,"FGBhQbmPwH8")
fadeIn([0,1],3) // fadeIn with duration of 3 secs.
fadeOut([0,1],5) // all videos fade out in 5 seconds.

search("Sang Won Lee aural Cavity")
loopAt([0,3],152,0.2)
loopAt([2,1],158,1)
unloop(all)
seek([2,3],144)
seek([0,1],146)

seek(all,144)
play()
createGrid(3,3,"FGBhQbmPwH8")



speed(all,1.25) // for all
speed(0,0.5) // one item
speed([1,2],2) // multiple items

mute(all,true)
volume(0,50)
turnup([1,2],-20)

// Turn all videos black & white
grayscale([0,2,4,6], true);

// Apply dreamlike tone
applyPreset(1, "tense");

// Highlight one video
blurVideo(not(3), 4);   // blur all except video 3
opacity(3, 1);          // full focus on 3

// Animate chaos effect
animateFilter([1,3,5], "hue-rotate(180deg) saturate(2) blur(1px)", 3);

// Tilt one video for spatial rhythm
tiltVideo(2, 10, -10, 1.1);

// Restore all visuals
setFilter(null, "none");
opacity(null, 1);
tiltVideo(null, 0, 0, 1);
