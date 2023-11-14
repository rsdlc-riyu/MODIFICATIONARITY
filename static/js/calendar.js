$(document).ready(function () {
    $('#calendar').fullCalendar({
        // ... Your calendar settings ...

        dayClick: function (date, jsEvent, view) {
            // Open a modal for adding observations
            $('#observationForm')[0].reset();
            $('#date').val(date.format());

            $('#observationModal').modal({
                title: 'Add Observation',
                width: 600,
                height: 800,
                modal: true,
                buttons: {
                    "Save": function () {
                        // Handle form submission and add/update the observation
                        var observerName = $('#observerName').val();
                        var date = $('#date').val();
                        var time = $('#time').val();
                        var location = $('#location').val();
                        var chickenID = $('#chickenID').val();
                        var breed = $('#breed').val();
                        var age = $('#age').val();
                        var colorMarkings = $('#colorMarkings').val();
                        var generalHealth = $("input[name='generalHealth']:checked").map(function () {
                            return this.value;
                        }).get();
                        var plumageColor = $("input[name='plumageColor']:checked").map(function () {
                            return this.value;
                        }).get();
                        var plumageCondition = $("input[name='plumageCondition']:checked").map(function () {
                            return this.value;
                        }).get();
                        // Repeat the process for other checkboxes and input fields

                        // Combine the observations into a single notes field
                        var notes = "Observer: " + observerName + "\nDate: " + date + "\nTime: " + time + "\nLocation: " + location +
                            "\nChicken ID: " + chickenID + "\nBreed: " + breed + "\nAge: " + age + "\nColor/Markings: " + colorMarkings +
                            "\nGeneral Health: " + generalHealth.join(', ') + "\nPlumage Color: " + plumageColor.join(', ') +
                            "\nPlumage Condition: " + plumageCondition.join(', ');

                        // Add the observation to the calendar
                        $('#calendar').fullCalendar('renderEvent', {
                            title: "Chicken Observation",
                            start: date + " " + time,
                            end: date + " " + time,
                            notes: notes
                        }, true);

                        $('#observationModal').modal('hide');
                    },
                    "Close": function () {
                        $('#observationModal').modal('hide');
                    }
                }
            });
        }
    });

    $("#observationForm").submit(function () {
        // Handle form submission and add/update the observation
        var observerName = $('#observerName').val();
        var date = $('#date').val();
        var time = $('#time').val();
        var location = $('#location').val();
        var chickenID = $('#chickenID').val();
        var breed = $('#breed').val();
        var age = $('#age').val();
        var colorMarkings = $('#colorMarkings').val();
        var generalHealth = $("input[name='generalHealth']:checked").map(function () {
            return this.value;
        }).get();
        var plumageColor = $("input[name='plumageColor']:checked").map(function () {
            return this.value;
        }).get();
        var plumageCondition = $("input[name='plumageCondition']:checked").map(function () {
            return this.value;
        }).get();
        // Repeat the process for other checkboxes and input fields

        // Combine the observations into a single notes field
        var notes = "Observer: " + observerName + "\nDate: " + date + "\nTime: " + time + "\nLocation: " + location +
            "\nChicken ID: " + chickenID + "\nBreed: " + breed + "\nAge: " + age + "\nColor/Markings: " + colorMarkings +
            "\nGeneral Health: " + generalHealth.join(', ') + "\nPlumage Color: " + plumageColor.join(', ') +
            "\nPlumage Condition: " + plumageCondition.join(', ');

        // Add the observation to the calendar
        $('#calendar').fullCalendar('renderEvent', {
            title: "Chicken Observation",
            start: date + " " + time,
            end: date + " " + time,
            notes: notes
        }, true);

        $('#observationModal').modal('hide');

        // Clear the form
        this.reset();

        return false; // Prevent the default form submission behavior
    });

    $("#start, #end").datetimepicker();
});