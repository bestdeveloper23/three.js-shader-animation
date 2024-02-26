3D Models Configuration

This JSON defines the configuration for 3D models, allowing specification of various attributes for each model.
Model Attributes:
•	ID (Mandatory): Unique identifier for each model.
•	Name (Mandatory): Display name of the model.
•	Color (Optional): RGB values representing the model color to override the default.
•	URL (Mandatory): Path to the model file.
•	Animation ID (Optional): Identifier for associated animations.
•	Scale (Optional): Scaling factors for the model along the x, y, and z axes. Defaults to [1, 1, 1] if not provided.
•	Position (Optional): Initial position of the model in 3D space. Defaults to [0, 0, 0] if not provided.
•	Rotation (Optional): Initial rotation angles of the model in 3D space. Defaults to [0, 0, 0] if not provided.

Key Points:
1.	If a color attribute is provided in the JSON, it replaces all model points; else, the model defaults to white.
2.	Position, rotation, and scale attributes in JSON act as offsets, modifying the model's placement.


Multiple Models
If an array contains multiple child arrays, the models within those child arrays will be processed as merged geometry. This enables the creation of complex scenes with multiple models combined.


{
    "models": [
        [{
            "id": "1",
            "name": "lincoln",
            "animationId": 3, // axisexplode in timeline1
            "url": "assets/models/lincoln.drc"
        }],
        [{
                "id": "5",
                "name": "A",
                "url": "assets/models/A_10000.drc"
            },
            {
                "id": "5",
                "name": "R",
                "url": "assets/models/R_10000.drc",
                "animationId": 11  // fadein timeline 1 
            },
            {
                "id": "5",
                "name": "I",
                "url": "assets/models/I_10000.drc"
                // no effect  
                
            },
            {
                "id": "5",
                "name": "VS",
                "url": "assets/models/VS_10000.drc"

            }
        ],
        [{
                "id": "6",
                "name": "A",
                "url": "assets/models/A_25000.drc"
            },
            {
                "id": "6",
                "name": "R",
                "url": "assets/models/R_25000.drc",
                "animationId": 12, explode in timeline 1 
            },
            {
                "id": "6",
                "name": "I",
                "url": "assets/models/I_25000.drc"
            },
            {
                "id": "6",
                "name": "VS",
                "url": "assets/models/VS_25000.drc"

            }
        ],
        [{
            "id": "2",
            "animationId": 3,
            "name": "R_10000",
            "url": "assets/models/R_10000.drc"
        }],
        [{
            "animationId": 3,
            "id": "3",
            "name": "A_10000",
            "url": "assets/models/A_10000.drc"

        }],
        [  // merge arivs
            {

                "id": "4",
                "name": "A",
                "color": { "r": 1, "g": 1, "b": 1 },
                "url": "assets/models/A_50000.drc",
                "animationId": 3,
                "scale": { "x": 1, "y": 1, "z": 1 },
                "position": { "x": 2, "y": 0, "z": 0 }, // offset x+=1
                "rotation": { "x": 0, "y": 0, "z": 0 }
            },
            {
                "id": "4",
                "name": "R",
                "color": { "r": 0.6938719153404236, "g": 0.09758713096380234, "b": 0.09758737683296204 },
                "url": "assets/models/R_50000.drc",
                "animationId": 11,
                "scale": { "x": 1, "y": 1, "z": 1 },
                "position": { "x": 0, "y": 0, "z": 0 },
                "rotation": { "x": 0, "y": 0, "z": 0 }
            },
            {
                "id": "4",
                "name": "I",
                "color": { "r": 1, "g": 1, "b": 1 },
                "url": "assets/models/I_50000.drc",
                "animationId": 3,
                "scale": { "x": 1, "y": 1, "z": 1 },
                "position": { "x": 0, "y": 0, "z": 0 },
                "rotation": { "x": 0, "y": 0, "z": 0 }
            },
            {
                "id": "4",
                "name": "VS",
                "color": { "r": 1, "g": 1, "b": 1 },
                "url": "assets/models/VS_50000.drc",
                "animationId": 3,
                "scale": { "x": 1, "y": 1, "z": 1 },
                "position": { "x": 0, "y": 0, "z": 0 },
                "rotation": { "x": 0, "y": 0, "z": 0 }
            }
        ]


    ]
}


run timeline.update() , im each swap to trigger animationId 


simulation 

brush force make how far the point mode 
gravity , lower gravity and higher brush force make more elastic effect





