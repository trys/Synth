var synth = (function () {
	"use strict";

	var keyboard = document.getElementById( 'keyboard' ),
		context = new AudioContext(),
		masterGain = context.createGain(),
		waveform = 'sine',
		notes = [];

	return {

		Initialise: function () {

			keyboard = new QwertyHancock({
				width: 600,
				height: 150,
				octaves: 2,
				startNote: 'A3'
			});

			masterGain.gain.value = 0.3;
			masterGain.connect( context.destination );

			keyboard.keyDown = synth.keyDown;
			keyboard.keyUp = synth.keyUp;

		},

		keyDown: function (note, frequency) {
			
			var oscillatorOne = context.createOscillator();
			
			oscillatorOne.type = waveform;
			oscillatorOne.frequency.value = frequency;
			oscillatorOne.connect( masterGain );
			oscillatorOne.start( 0 );

			if ( notes[ note ] !== undefined ) {
				notes[ note ].stop( 0 );
				notes[ note ].disconnect();
			}

			notes[ note ] = oscillatorOne;

		},
		
		keyUp: function ( note, frequency ) {

			if ( notes[ note ] !== undefined ) {
				notes[ note ].stop( 0 );
				notes[ note ].disconnect();
			}

		}
		

	};
}());

window.AudioContext = window.AudioContext || window.webkitAudioContext;
synth.Initialise();



	






