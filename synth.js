var Synth = (function () {
	"use strict";

	var keyboard = document.getElementById( 'keyboard' ),
		context = new AudioContext(),
		masterGain = context.createGain(),
		chOneOutputGain = context.createGain(),
		chTwoOutputGain = context.createGain(),
		chSum = context.createGain(),
		Oscillators = {},
		Envelope,
		VCO,
		VCA,
		chOneSettings = {
			wave: 'sine',
			detune: 0,
			attack: 0,
			release: 0.3,
			sustain: 1,
			pan: 0
		},
		chTwoSettings = {
			wave: 'sine',
			detune: 10,
			attack: 0.3,
			release: 0.3,
			sustain: 1,
			pan: 1
		};

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
			
			chSum.connect( masterGain );

			masterGain.gain.value = 0.5;
			masterGain.connect( context.destination );

			keyboard.keyDown = Synth.KeyDown;
			keyboard.keyUp = Synth.KeyUp;
			
		},

		Define: {

			Concepts: function () {

				Synth.Define.VCO();
				Synth.Define.Envelope();
				Synth.Define.VCA();

			},

			VCO: function () {

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
						this.oscillator.type = type;
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

			},

			Envelope: function () {

				Envelope = ( function( context ) {

					function Envelope() {
						this.attackTime = 0.1;
						this.releaseTime = 0.1;
					};

					Envelope.prototype.setAttack = function ( attack ) {
						this.attackTime = attack;
					};

					Envelope.prototype.setRelease = function ( release ) {
						this.releaseTime = release;
					};

					Envelope.prototype.setSustain = function ( sustain ) {
						this.sustain = sustain;
					};

					Envelope.prototype.trigger = function() {
						var now = context.currentTime;
						this.param.cancelScheduledValues(now);
						this.param.setValueAtTime(0, now);
						this.param.linearRampToValueAtTime(1, now + this.attackTime);
						this.currentTime = now;

						if ( this.sustain === 1 ) {

						} else {
							this.param.linearRampToValueAtTime( 0, now + this.attackTime + this.releaseTime );
						}
					};

					Envelope.prototype.connect = function(param) {
						this.param = param;
					};

					return Envelope;
				})(context);

			},

			VCA: function () {

				VCA = ( function( context ) {

					function VCA() {
						this.gain = context.createGain();
						this.gain.gain.value = 0;
						this.input = this.gain;
						this.output = this.gain;
						this.amplitude = this.gain.gain;
					};

					VCA.prototype.connect = function( node ) {
						if ( node.hasOwnProperty( 'input' ) ) {
							this.output.connect( node.input );
						} else {
							this.output.connect( node );
						};
					}

					return VCA;
				})(context);

			}

		},

		Channel: {

			PlayNote: function ( frequency ) {

				Oscillators[ frequency ] = Synth.Channel.CreateOscillators( frequency );

			},

			StopNote: function ( frequency ) {

				Synth.Channel.StopOscillators( frequency );
				delete Oscillators[ frequency ];

			},

			CreateOscillators: function ( frequency ) {

				var CreatedOscillators = [];

				if ( chOneSettings !== undefined ) {
					CreatedOscillators.push( Synth.Channel.CreateOscillator( chOneSettings, frequency ) );
				}

				if ( chTwoSettings !== undefined ) {
					CreatedOscillators.push( Synth.Channel.CreateOscillator( chTwoSettings, frequency ) );
				}

				return CreatedOscillators;

			},

			CreateOscillator: function ( settings, frequency ) {

				var vco = new VCO,
					vca = new VCA,
					envelope = new Envelope,
					pannerGain = context.createGain(),
					panner = context.createPanner();

				vco.setType( settings.wave );
				vco.setDetune( settings.detune );
				vco.setFrequency( frequency );

				envelope.setAttack( settings.attack );
				envelope.setRelease( settings.release );
				envelope.setSustain( settings.sustain );

				vco.connect( vca );
				vca.connect( pannerGain );
			
				pannerGain.connect( panner );

				panner.panningModel = 'equalpower';
				panner.setPosition( settings.pan, 0, 1 - Math.abs( settings.pan ) );
				panner.connect( chSum );

				envelope.connect( vca.amplitude );
				envelope.trigger();

				return {
					vco: vco,
					vca: vca,
					envelope: envelope,
					panner: panner
				}

			},

			StopOscillators: function ( frequency ) {

				var thisOscillator,
					stopTime;

				for ( var i = Oscillators[ frequency ].length - 1; i >= 0; i-- ) {

					thisOscillator = Oscillators[ frequency ][ i ];
					stopTime = context.currentTime + thisOscillator.envelope.attackTime + thisOscillator.envelope.releaseTime;

					if ( thisOscillator.envelope.sustain === 1 ) {
						thisOscillator.envelope.param.setValueAtTime( 1, context.currentTime );
						thisOscillator.envelope.param.linearRampToValueAtTime( 0, stopTime );
					}

					thisOscillator.vco.oscillator.stop( stopTime );

				};

			}

		},

		KeyDown: function ( note, frequency ) {

			if ( Oscillators[ frequency ] === undefined ) {
				Synth.Channel.PlayNote( frequency );
			}

		},

		KeyUp: function ( note, frequency ) {

			if ( Oscillators[ frequency ] !== undefined ) {
				Synth.Channel.StopNote( frequency );
			}

		},

		Trigger: function ( event, data ) {

			if ( window.CustomEvent ) {
				var event = new CustomEvent( event, { detail: data } );
			} else {
				var event = document.createEvent( 'CustomEvent' );
				event.initCustomEvent( event, true, true, data );
			}

			document.body.dispatchEvent( event );

		}

		
	};
}());

window.AudioContext = window.AudioContext || window.webkitAudioContext;
Synth.Initialise();



	






