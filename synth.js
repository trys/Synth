var Synth = (function () {
	"use strict";

	var keyboard = document.getElementById( 'keyboard' ),
		context = new AudioContext(),
		masterGain = context.createGain(),
		osOneOutputGain = context.createGain(),
		osSum = context.createGain(),
		VCO,
		osOneSettings = {
			wave: 'sine',
			pitch: 1,
			detune: 0
		},
		notes = [];

	return {

		Initialise: function () {

			// Keyboard setup and basic gain routing
			keyboard = new QwertyHancock({
				width: 600,
				height: 150,
				octaves: 2,
				startNote: 'A3'
			});

			Synth.Define.Concepts();

			osOneOutputGain.connect( osSum );
			osSum.connect( masterGain );

			masterGain.gain.value = 0.5;
			masterGain.connect( context.destination );

			keyboard.keyDown = Synth.KeyDown;
			keyboard.keyUp = Synth.KeyUp;

		},

		Define: {

			Concepts: function () {

				Synth.Define.VCO();

			},

			VCO: function () {

				// VCO class
				VCO = (function( context ) {
					
					function VCO() {
						
						this.oscillator = context.createOscillator();
						this.oscillator.start( 0 );

						this.input = this.oscillator;
						this.output = this.oscillator;

					};

					VCO.prototype.setFrequency = function( frequency ) {
						this.oscillator.frequency.setValueAtTime( frequency, context.currentTime );
					};

					VCO.prototype.setType = function( type ) {
						this.oscillator.type.value = type;
					};

					VCO.prototype.setDetune = function( detune ) {
						this.oscillator.detune.setValueAtTime( detune, context.currentTime );
					};

					VCO.prototype.connect = function( node ) {
						
						if ( node.hasOwnProperty( 'input' ) ) {
							this.output.connect( node.input );
						} else {
							this.output.connect( node );
						};

					}

					return VCO;
				})(context);

			}

		},

		KeyDown: function (note, frequency) {
			
			var osOne = new VCO;
			
			osOne.setType( osOneSettings.wave );
			osOne.setFrequency( frequency * osOneSettings.pitch );
			osOne.setDetune( osOneSettings.detune );

			osOne.connect( osOneOutputGain );

			if ( notes[ note ] !== undefined ) {
				notes[ note ].oscillator.stop( 0 );
				notes[ note ].oscillator.disconnect();
			}

			notes[ note ] = osOne;

		},
		
		KeyUp: function ( note, frequency ) {

			if ( notes[ note ] !== undefined ) {
				notes[ note ].oscillator.stop( 0 );
				notes[ note ].oscillator.disconnect();
			}

		}

		
	};
}());

window.AudioContext = window.AudioContext || window.webkitAudioContext;
Synth.Initialise();



	






