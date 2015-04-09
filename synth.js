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
		Filter,
		Settings = [
			{
				id: 0,
				engaged: true,
				oscillator: {
					wave: 'sawtooth',
					detune: 0,
					attack: 0,
					release: 0.1,
					sustain: 1,
				},
				filter: {
					frequency: 15000,
					origin: 100,
					attack: 1,
					release: 1,
					sustain: 1,
					type: 'lowpass',
					q: 10
				}
			},
			{
				id: 1,
				engaged: true,
				oscillator: {
					wave: 'sawtooth',
					detune: 10,
					attack: 0,
					release: 0.1,
					sustain: 1,
				},
				filter: {
					frequency: 15000,
					origin: 100,
					attack: 1,
					release: 1,
					sustain: 1,
					type: 'lowpass',
					q: 10
				}
			}
		],
		controls = {},
		channel = 0;

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

			Synth.Controls.Setup();
			
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
				Synth.Define.Filter();

			},

			VCO: function () {

				VCO = (function( context ) {
					
					function VCO() {
						
						this.oscillator = context.createOscillator();
						this.oscillator.start( context.currentTime );

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

					Envelope.prototype.trigger = function( start, end ) {

						var now = context.currentTime;
						this.param.cancelScheduledValues( now );
						this.param.setValueAtTime( start, now );
						this.param.linearRampToValueAtTime( end, now + this.attackTime );

						this.start = start;
						this.end = end;

						if ( this.sustain !== 1 ) {
							this.param.linearRampToValueAtTime( start, now + this.attackTime + this.releaseTime );
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

			},

			Filter: function () {

				Filter = ( function( context ) {

					function Filter() {
						
						this.filter = context.createBiquadFilter();
						
						this.input = this.filter;
						this.output = this.filter;

						this.frequency = this.filter.frequency;

						Filter.prototype.setFrequency = function ( frequency ) {
							this.filter.frequency.value = frequency;
						};

						Filter.prototype.setType = function ( type ) {
							this.filter.type = type;
						};

						Filter.prototype.setQ = function ( Q ) {
							this.filter.Q.value = Q;
						};

					};

					Filter.prototype.connect = function( node ) {
						
						if ( node.hasOwnProperty( 'input' ) ) {
							this.output.connect( node.input );
						} else {
							this.output.connect( node );
						};

					}

					return Filter;
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

				var CreatedOscillators = {
					oscillators : [],
					merger : context.createChannelMerger( 2 )
				}

				if ( Settings[ 0 ] !== undefined && Settings[ 0 ].engaged ) {
					CreatedOscillators.oscillators.push( Synth.Channel.CreateOscillator( Settings[ 0 ], frequency, CreatedOscillators ) );
				}

				if ( Settings[ 1 ] !== undefined && Settings[ 1 ].engaged ) {
					CreatedOscillators.oscillators.push( Synth.Channel.CreateOscillator( Settings[ 1 ], frequency, CreatedOscillators ) );
				}

				CreatedOscillators.merger.connect( chSum );

				return CreatedOscillators;

			},

			CreateOscillator: function ( settings, frequency, object ) {

				var vco = new VCO,
					vca = new VCA,
					envelope = new Envelope,
					filter = new Filter,
					filterEnvelope = new Envelope;

				vco.setType( settings.oscillator.wave );
				vco.setDetune( settings.oscillator.detune );
				vco.setFrequency( frequency );

				envelope.setAttack( settings.oscillator.attack );
				envelope.setRelease( settings.oscillator.release );
				envelope.setSustain( settings.oscillator.sustain );

				vco.connect( vca );
				vca.connect( filter );
				filter.connect( object.merger, 0, settings.id );

				filter.setFrequency( settings.filter.frequency );
				filter.setType( settings.filter.type );
				filter.setQ( settings.filter.q );

				filterEnvelope.setAttack( settings.filter.attack );
				filterEnvelope.setRelease( settings.filter.release );
				filterEnvelope.setSustain( settings.filter.sustain );

				filterEnvelope.connect( filter.frequency );
				filterEnvelope.trigger( settings.filter.origin, settings.filter.frequency );

				envelope.connect( vca.amplitude );
				envelope.trigger( 0, 1 );

				return {
					vco: vco,
					vca: vca,
					envelope: envelope,
					filterEnvelope: filterEnvelope
				}

			},

			StopOscillators: function ( frequency ) {

				var thisOscillator,
					stopTime;

				for ( var i = Oscillators[ frequency ].oscillators.length - 1; i >= 0; i-- ) {

					thisOscillator = Oscillators[ frequency ].oscillators[ i ];
					stopTime = context.currentTime + thisOscillator.envelope.attackTime + thisOscillator.envelope.releaseTime;

					if ( thisOscillator.envelope.sustain === 1 ) {
						thisOscillator.envelope.param.setValueAtTime( thisOscillator.envelope.end, context.currentTime );
						thisOscillator.envelope.param.linearRampToValueAtTime( thisOscillator.envelope.start, stopTime );
					}

					if ( thisOscillator.filterEnvelope.sustain === 1 ) {
						thisOscillator.envelope.param.setValueAtTime( thisOscillator.envelope.end, context.currentTime );
						thisOscillator.envelope.param.linearRampToValueAtTime( thisOscillator.envelope.start, stopTime );
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

		Controls: {

			Setup: function () {

				controls = {
					oscillator: {},
					channels: [],
					filter: {}
				};

				/* Channels */
				controls.channels.engaged = [
					document.getElementById( 'channel_engage_one' ),
					document.getElementById( 'channel_engage_two' )
				];

				controls.channels.engaged[ 0 ].addEventListener( 'change', Synth.Controls.UpdateChannelEngage );
				controls.channels.engaged[ 1 ].addEventListener( 'change', Synth.Controls.UpdateChannelEngage );


				/* Oscillators */
				controls.oscillator.wave = document.getElementById( 'oscillator_wave' );
				controls.oscillator.detune = document.getElementById( 'oscillator_detune' );
				controls.oscillator.attack = document.getElementById( 'oscillator_attack' );
				controls.oscillator.sustain = document.getElementById( 'oscillator_sustain' );
				controls.oscillator.release = document.getElementById( 'oscillator_release' );

				controls.oscillator.wave.addEventListener( 'change', Synth.Controls.UpdateText );
				controls.oscillator.detune.addEventListener( 'input', Synth.Controls.Update );
				controls.oscillator.attack.addEventListener( 'input', Synth.Controls.Update );
				controls.oscillator.sustain.addEventListener( 'input', Synth.Controls.Update );
				controls.oscillator.release.addEventListener( 'input', Synth.Controls.Update );


				/* Filters */
				controls.filter.type = document.getElementById( 'filter_type' );
				controls.filter.q = document.getElementById( 'filter_q' );
				controls.filter.origin = document.getElementById( 'filter_origin' );
				controls.filter.frequency = document.getElementById( 'filter_frequency' );
				controls.filter.attack = document.getElementById( 'filter_attack' );
				controls.filter.sustain = document.getElementById( 'filter_sustain' );
				controls.filter.release = document.getElementById( 'filter_release' );

				controls.filter.type.addEventListener( 'change', Synth.Controls.UpdateText );
				controls.filter.q.addEventListener( 'input', Synth.Controls.Update );
				controls.filter.origin.addEventListener( 'input', Synth.Controls.Update );
				controls.filter.frequency.addEventListener( 'input', Synth.Controls.Update );
				controls.filter.attack.addEventListener( 'input', Synth.Controls.Update );
				controls.filter.sustain.addEventListener( 'input', Synth.Controls.Update );
				controls.filter.release.addEventListener( 'input', Synth.Controls.Update );


				/* Channel Selection */
				var channels = [
						document.getElementById( 'channel_select_one' ),
						document.getElementById( 'channel_select_two' )
					];

				channels[ 0 ].addEventListener( 'change', Synth.Controls.SetChannel );
				channels[ 1 ].addEventListener( 'change', Synth.Controls.SetChannel );


				/* Set Channel Values */
				Synth.Controls.SetControls();

			},

			GetChannel: function () {

				channel = parseInt( document.getElementById( 'controls' ).getAttribute( 'data-channel' ) );

			},

			SetChannel: function ( event ) {

				var target = event.target,
					container = document.getElementById( 'controls' ),
					splitTarget = target.value.split( '.' ),
					channels = [
						document.getElementById( 'channel_select_one' ),
						document.getElementById( 'channel_select_two' )
					];

				container.setAttribute( 'data-channel', splitTarget[ 1 ] );

				Synth.Controls.SetControls();
				
			},

			SetControls: function () {

				Synth.Controls.GetChannel();

				/* Channels */
				controls.channels.engaged[ 0 ].checked = Settings[ 0 ].engaged;
				controls.channels.engaged[ 1 ].checked = Settings[ 1 ].engaged;

				/* Oscillators */
				for ( var i = controls.oscillator.wave.options.length - 1; i >= 0; i-- ) {
					if ( controls.oscillator.wave.options[ i ].value === Settings[ channel ].oscillator.wave ) {
						controls.oscillator.wave.options[ i ].selected = true;
					}
				};

				controls.oscillator.detune.value = Settings[ channel ].oscillator.detune;
				controls.oscillator.attack.value = Settings[ channel ].oscillator.attack;
				controls.oscillator.sustain.value = Settings[ channel ].oscillator.sustain;
				controls.oscillator.release.value = Settings[ channel ].oscillator.release;

				/* Filters */
				for ( var i = controls.filter.type.options.length - 1; i >= 0; i-- ) {
					if ( controls.filter.type.options[ i ].value === Settings[ channel ].filter.type ) {
						controls.filter.type.options[ i ].selected = true;
					}
				};

				controls.filter.q.value = Settings[ channel ].filter.q;
				controls.filter.origin.value = Settings[ channel ].filter.origin;
				controls.filter.frequency.value = Settings[ channel ].filter.frequency;
				controls.filter.attack.value = Settings[ channel ].filter.attack;
				controls.filter.sustain.value = Settings[ channel ].filter.sustain;
				controls.filter.release.value = Settings[ channel ].filter.release;

			},

			Update: function ( event ) {

				var target = event.target,
					splitTarget = target.getAttribute( 'name' ).split( '.' );

				Settings[ channel ][ splitTarget[ 0 ] ][ splitTarget[ 1 ] ] = parseFloat( target.value );

			},

			UpdateText: function ( event ) {

				var target = event.target,
					splitTarget = target.getAttribute( 'name' ).split( '.' );

				Settings[ channel ][ splitTarget[ 0 ] ][ splitTarget[ 1 ] ] = target.value;

			},

			UpdateChannelEngage: function ( event ) {

				var target = event.target,
					splitTarget = target.value.split( '.' );

				Settings[ splitTarget[ 1 ] ].engaged = target.checked;

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



	






