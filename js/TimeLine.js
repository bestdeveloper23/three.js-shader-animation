// Class representing a timeline manager with multiple timelines for animation control.
class TimeLine extends THREE.EventDispatcher {
    // Constructor for TimeLine class.
    // @param {Object} globalUniforms - The global uniforms object shared across the application.
    constructor(globalUniforms) {
      super();
  
      // Total duration of the timeline in milliseconds.
      this.duration = 3000;
  
      // Easing function for the first timeline.
      this.interpolate_1 = TWEEN.Easing.Linear.None;
  
      // Easing function for the second timeline.
      this.interpolate_2 = TWEEN.Easing.Quadratic.InOut;
  
      // Reference to the global uniforms object.
      this.globalUniforms = globalUniforms;
    }
  
    // Update method to initialize and play the timelines.
    update() {
      // Dispatch reset event before starting the timeline 1.
      if (this.timeline1) this.dispatchEvent({
        type: "reset"
      });
  
      // Remove all existing tweens to avoid conflicts.
      TWEEN.removeAll();
  
      // Disable simulation during the timeline animation.
      this.globalUniforms.enableSimulation.value = false;
  
      // Initialize and start timeline 1.
      this.globalUniforms.uProgress.value.x = 0;
      this.globalUniforms.uProgress.value.y = 0;
      this.timeline2 = new TWEEN.Tween(this.globalUniforms.uProgress.value)
        .to(
          {
            y: 1,
          },
          this.duration
        )
        .easing(this.interpolate_2)
        .onUpdate((value) => {})
        .onComplete(() => {
          // Log completion and trigger end event.
          console.log("2 complete");
          this.dispatchEvent({
            type: "end"
          });
  
          // Enable simulation, reset progress values, and start timeline 1 again.
          this.globalUniforms.enableSimulation.value = true;
          this.globalUniforms.uProgress.value.x = 0;
          this.globalUniforms.uProgress.value.y = 0;
        });
  
      // Initialize and start timeline 2.
      this.timeline1 = new TWEEN.Tween(this.globalUniforms.uProgress.value)
        .to({
          x: 1
        }, this.duration)
        .easing(this.interpolate_1)
        .onComplete(() => {
          // Start timeline 2 when timeline 1 completes.
          this.timeline2.start();
        })
        .onStart(() => {
          // Log start and trigger start event.
          this.dispatchEvent({
            type: "start"
          });
        });
  
      // Start the initial timeline.
      this.timeline1.start();
    }
  }
  