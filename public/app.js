
const clientList = document.getElementById('clientList');
const deleteClientSelect = document.getElementById('deleteClient');

// Function to create a new client
function createClient() {
    const nickname = document.getElementById('clientName').value;

    // Check if client name already exists
    if (Array.from(clientList.children).some(li => li.innerText === clientName)) {
        alert('Client name already exists!');
        return;
    }

    // Make POST request to create client
    fetch('/client', {
        method: 'POST',
        headers: {
        'Content-Type': 'application/json'
        },
        body: JSON.stringify({ nickname })
    })
    .then(response => {
        if (!response.ok) {
        throw new Error('Failed to create client');
        }
        return response.json();
    })
    .then(data => {
        // Add client name to client list
        const li = document.createElement('li');
        li.innerText = data.clientName;
        clientList.appendChild(li);

        // Add client name to delete client select options
        const option = document.createElement('option');
        option.value = data.clientName;
        option.innerText = data.clientName;
        deleteClientSelect.appendChild(option);

        // Clear input field
        document.getElementById('clientName').value = '';
    })
    .catch(error => {
        console.error(error);
        alert('Failed to create client');
    });
}

$(document).ready(function() {
    // Function to get list of all clients
    function getAllClients() {
        $.ajax({
        url: "/clients",
        type: "GET",
        success: function(clients) {
            // Clear the existing client list
            $("#client-list").empty();

            // Add each client to the list
            clients.forEach(function(client) {
            $("#client-list").append(
                "<tr>" +
                "<td>" + client.name + "</td>" +
                "<td>" +
                "<button class='btn btn-danger' onclick='deleteClient(\"" + client.name + "\")'>Delete</button>" +
                "</td>" +
                "</tr>"
            );
            });
        },
        error: function() {
            alert("Failed to get clients!");
        }
        });
    }

    function addTopic(topicName) {
        $.ajax({
          url: '/topic/' + topicName,
          type: 'POST',
          success: function(response) {
            console.log(response);
            // Do something with the response, e.g. display a success message
            alert('Added topic!');
          },
          error: function(error) {
            console.log(error);
            // Handle the error, e.g. display an error message
            alert('Error on topic!');
          }
        });
      }
      
      function listTopics() {
        $.ajax({
          url: '/topics',
          type: 'GET',
          success: function(topics) {
            console.log(topics);
            $("#topics-list").empty();

            // Add each client to the list
            topics.forEach(function(topic) {
                $("#topics-list").append(
                    "<tr>" +
                    "<td>" + topic + "</td>" +
                    "<td>" +
                    "<button class='btn btn-danger' onclick='deleteClient(\"" + topic + "\")'>Delete</button>" +
                    "</td>" +
                    "</tr>"
                );
            });
          },
          error: function(error) {
            console.log(error);
            // Handle the error, e.g. display an error message
          }
        });
      }
      

// Function to delete a client
// function deleteClient(name) {
//   if (confirm("Are you sure you want to delete the client " + name + "?")) {
//     $.ajax({
//       url: "/clients/" + name,
//       type: "DELETE",
//       success: function() {
//         getAllClients();
//       },
//       error: function() {
//         alert("Failed to delete client!");
//       }
//     });
//   }
// }

// Load the initial client list
getAllClients();
});


 // Handle form submit event
 document.getElementById("message-form").addEventListener("submit", function(event) {
    event.preventDefault();
    const topic = document.getElementById("topic").value;
    fetch(`/topics/${topic}`)
      .then(response => response.json())
      .then(data => {
        const messageList = document.getElementById("message-list");
        const listItem = document.createElement("li");
        listItem.innerText = data.message;
        messageList.appendChild(listItem);
      })
      .catch(error => console.error(error));
  });

  // Handle list button click event
  document.getElementById("list-button").addEventListener("click", function() {
    fetch("/messages")
      .then(response => response.json())
      .then(data => {
        const messageList = document.getElementById("message-list");
        messageList.innerHTML = "";
        data.forEach(message => {
          const listItem = document.createElement("li");
          listItem.innerText = message;
          messageList.appendChild(listItem);
        });
      })
      .catch(error => console.error(error));
  });

//   Handle delete button click event
  document.getElementById("delete-button").addEventListener("click", function() {
    fetch("/messages", { method: "DELETE" })
      .then(response => response.json())
      .then(data => {
        const messageList = document.getElementById("message-list");
        messageList.innerHTML = "";
      })
      .catch(error => console.error(error));
  });