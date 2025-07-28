import json
import os
import boto3

sqs = boto3.client('sqs')

SQS_QUEUE_URL = os.environ.get('SQS_QUEUE_URL')

def lambda_handler(event, context):
    # This print will now show the full API Gateway proxy event (with 'httpMethod', 'body', 'headers', etc.)
    print(f"Received event in submitRecipeLambda (full proxy event expected): {json.dumps(event)}") 

    headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'OPTIONS,POST,PUT,GET,DELETE'
    }

    try:
        # 1. Extract the raw JSON string of the recipe data from API Gateway event's 'body'.
        # This 'event' is a Python dictionary. Its 'body' field contains the actual frontend JSON *as a string*.
        raw_recipe_json_string = event.get('body') # This should now correctly get the string

        if not raw_recipe_json_string:
            # If body is None or empty string, it's a bad request
            print("ERROR: Raw recipe JSON string is missing or empty from event.get('body').")
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({'message': 'Cuerpo de la solicitud vacío o inválido.'})
            }

        # 2. Parse the raw_recipe_json_string into a Python dictionary for validation.
        try:
            recipe_data = json.loads(raw_recipe_json_string) # Parse the string into a dict
        except json.JSONDecodeError:
            print("ERROR: Failed to parse raw_recipe_json_string into a dictionary.")
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({'message': 'JSON de la receta inválido en el cuerpo.'})
            }

        # 3. Validate keys in the recipe_data dictionary.
        required_fields = ['Nombre', 'Ingredientes', 'Instrucciones']
        if not all(field in recipe_data for field in required_fields):
            print(f"ERROR: Missing required fields in recipe data: {recipe_data}")
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({'message': 'Faltan algunos de los campos requeridos (Nombre, Ingredientes, Instrucciones).'})
            }
        print(f"Lo que se envía es: {json.dumps(recipe_data)}")
        # 4. Prepare the message for SQS.
        # Send the raw_recipe_json_string directly to SQS. It's already a valid JSON string.
        sqs.send_message(
            QueueUrl=SQS_QUEUE_URL,
            MessageBody=json.dumps(recipe_data), # Send the string directly
            DelaySeconds=0
        )

        return {
            'statusCode': 202,
            'headers': headers,
            'body': json.dumps({'message': 'Receta recibida con éxito para su procesamiento.'})
        }

    except Exception as e:
        print(f"ERROR: General exception in submitRecipeLambda: {e}")
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'message': f'Error al procesar la solicitud. Error: {str(e)}'})
        }